import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import pdf from 'pdf-parse'
import { logApiUsage, getCreditStatus, incrementCreditsUsed, CREDITS_EXHAUSTED_MESSAGE } from '@/lib/api-cost'

export const maxDuration = 300

const SYSTEM_PROMPT_BASE = `Du bist ein Elite-Lernstratege und Didaktik-Experte für Hochschulprüfungen.

AUFTRAG:
Erstelle ein Flashcard-Deck das einen Studenten schnellstmöglich prüfungsready macht — nicht vollständig dokumentiert.
Denke zuerst strategisch: Was sind die Kern-Konzepte? Was baut worauf auf? Was kann man aus dem Kernprinzip ableiten (→ braucht keine eigene Karte)?
Weniger, dafür perfekte Karten. Lieber 12 präzise als 25 mittelmässige.

ANTWORT-FORMATE — du wählst pro Karte das Format das die Info am schnellsten einprägbar macht:

1. STANDARD — 1–2 kurze Sätze, einprägsames Kernprinzip. Lesezeit < 5 Sekunden.
   → Für: Konzepte, Zusammenhänge, Kausalität, Definitionen
   → Beispiel: "BPM requires deep org knowledge because changing one process pillar disrupts all others."

2. LISTE — Max. 3–5 fette Key-Terms, jeder auf einer eigenen Zeile (Zeilenumbruch \n zwischen den Items).
   → Für: Aufzählungen die wirklich auswendig gelernt werden müssen
   → Format: **Term A**\n**Term B**\n**Term C**
   → Beispiel: **Task division**\n**Task allocation**\n**Rewards**\n**Information**

3. PROZESS — Visuelle Kette, max. 5 Schritte, 1–3 Schlagwörter pro Schritt.
   → Für: Lifecycles, Workflows, Phasenmodelle
   → Format: Schritt A ➔ Schritt B ➔ Schritt C
   → Beispiel: Identifikation ➔ Entdeckung ➔ Analyse ➔ Redesign ➔ Implementierung

4. VERGLEICH — Parallele Gegenüberstellung.
   → Für: "Was unterscheidet X von Y?"
   → Format: X: **Begriff** / Y: **Begriff**
   → Beispiel: Push: **forecast-driven** / Pull: **demand-driven**

VERBOTEN in der Antwort (antwort-Feld):
- Lange "Weil..."-Satzstrukturen oder vollständige Erklärungen
- Mehr als 4 Items in einer Liste
- Antworten die länger als 5 Sekunden zu lesen sind
- Alles was erklärt WARUM → gehört in kontext_erklaerung

KONTEXT-FELD (kontext_erklaerung):
Hier gehört alles was hilft zu VERSTEHEN warum die Antwort gilt:
- Mechanismus, Herleitung, Kausalität
- Einordnung im Gesamtthema
- Bezug zu anderen Konzepten des Kurses
- Max. 2–3 prägnante Sätze

FILTER — stelle dir vor jeder Karte diese Fragen:
✓ Würde ein Prüfer genau das fragen?
✓ Kann der Student die Antwort in 20 Sekunden lernen?
✓ Ist die Antwort in < 5 Sekunden lesbar?
✗ Kann man es aus dem Kernprinzip ableiten? → keine eigene Karte nötig
✗ Wäre diese Karte frustrierend weil die Antwort zu lang zum Merken ist?

TAGS:
- Erster Tag: "core" (Prüfungsessentiell) oder "detail" (Vertiefung)
- Max. 10–15% der Karten bekommen zusätzlich "fokus" (fast sicher in der Prüfung — sehr restriktiv!)
- 1–2 weitere Tags: "definition", "formel", "prozess", "vergleich", "beispiel"

SPRACHE: Erkenne die Sprache der Folien und erstelle ALLE Karten konsequent in genau dieser Sprache.
Wechsle die Sprache nicht, auch wenn du auf Deutsch angesprochen wirst.

KARTENTYPEN:
- 'basic': Klassische Frage/Antwort-Karte
- 'cloze': Lückentext mit {{c1::Begriff}} — optimal für Begriffe, Definitionen, Prozessschritte

Gib ausschliesslich ein JSON-Array zurück, kein Markdown, kein Kommentar:
[
  {
    "typ": "basic",
    "frage": "...",
    "antwort": "...",
    "cloze_text": "",
    "kontext_erklaerung": "...",
    "slide_nummer": <int>,
    "tags": ["core", "fokus", "tag1"]
  },
  {
    "typ": "cloze",
    "frage": "",
    "antwort": "",
    "cloze_text": "...",
    "kontext_erklaerung": "...",
    "slide_nummer": <int>,
    "tags": ["core", "tag1"]
  }
]`

function getKartentypInstructions(clozeProzent: number, richtwert: number): string {
  const basicProzent = 100 - clozeProzent
  const mixText = clozeProzent >= 60
    ? `~${clozeProzent}% Cloze (Begriffe, Definitionen, Prozessschritte) und ~${basicProzent}% Basic (Konzepte, Zusammenhänge)`
    : clozeProzent <= 30
    ? `~${basicProzent}% Basic (konzeptuelle Fragen, Kausalzusammenhänge) und ~${clozeProzent}% Cloze`
    : `Ausgewogener Mix — ~${clozeProzent}% Cloze für Schlüsselbegriffe, ~${basicProzent}% Basic für Konzepte`

  return `\nKARTENTYP-MIX: ${mixText}.\n\nRICHTWERT KARTENMENGE: ~${richtwert} Karten. Du kannst abweichen wenn der Inhalt es begründet — aber bleibe im Geist: lieber weniger präzise als viele mittelmässige Karten.`
}

interface RawCard {
  typ: string
  frage: string
  antwort: string
  cloze_text: string
  kontext_erklaerung: string
  slide_nummer: number
  tags: string[]
}

function parseJson(raw: string): RawCard[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  return JSON.parse(cleaned)
}

async function extractPageTexts(buffer: Buffer): Promise<string[]> {
  const pages: string[] = []
  await pdf(buffer, {
    async pagerender(pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) {
      const content = await pageData.getTextContent()
      const text = content.items.map((item) => item.str).join(' ')
      pages.push(text)
      return text
    },
  } as Parameters<typeof pdf>[1])
  return pages
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY nicht gesetzt' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creditStatus = await getCreditStatus(supabase, user.id)
  if (creditStatus.exhausted) {
    return NextResponse.json({ error: 'credits_exhausted', message: CREDITS_EXHAUSTED_MESSAGE }, { status: 402 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File | null
    const clozeProzent = Math.min(80, Math.max(20, parseInt((formData.get('cloze_anteil') as string) ?? '50') || 50))
    const themaId = formData.get('thema_id')

    if (!file) return NextResponse.json({ error: 'Kein PDF hochgeladen (field: pdf)' }, { status: 400 })
    if (!themaId) return NextResponse.json({ error: 'thema_id fehlt' }, { status: 400 })

    const pageFrom = (formData.get('page_from') as string | null) || null
    const pageTo = (formData.get('page_to') as string | null) || null
    const useVision = (formData.get('vision') as string) === 'true'
    const batchSize = parseInt((formData.get('batch_size') as string) ?? '20') || 20
    const conceptsRaw = formData.get('concepts') as string | null
    const conceptsList = conceptsRaw ? (JSON.parse(conceptsRaw) as string[]) : null

    // ── Kurs context ──────────────────────────────────────────────────────────
    let kursKontext = ''
    let duplicateHint = ''

    const { data: themaRow } = await supabase
      .from('thema')
      .select('name, kurs_id')
      .eq('id', Number(themaId))
      .single()

    if (themaRow) {
      const { data: kursRow } = await supabase
        .from('kurs')
        .select('name')
        .eq('id', themaRow.kurs_id)
        .single()

      if (kursRow) {
        const { data: alleThemen } = await supabase
          .from('thema')
          .select('name')
          .eq('kurs_id', themaRow.kurs_id)
          .order('name')

        const andereThemen = (alleThemen ?? [])
          .map((t: { name: string }) => t.name)
          .filter((n: string) => n !== themaRow.name)

        kursKontext = `\n\nKURSKONTEXT:
Kurs: "${kursRow.name}" (typischer Bachelor-Studiengang).
Aktuelles Thema: "${themaRow.name}".
${andereThemen.length > 0 ? `Weitere Themen dieses Kurses: ${andereThemen.join(', ')}.` : ''}
Nutze dein Wissen über "${kursRow.name}" Bachelor-Kurse um zu beurteilen welche Konzepte prüfungsrelevant sind. Gehe bei Themen, die in anderen Kursthemen behandelt werden, nicht unnötig tief.`
      }

      // ── Duplicate prevention ──────────────────────────────────────────────
      const { data: existingCards } = await supabase
        .from('karte')
        .select('frage, cloze_text')
        .eq('thema_id', Number(themaId))
        .in('status', ['neu', 'reviewed'])
        .limit(50)

      if (existingCards && existingCards.length > 0) {
        const existingList = existingCards
          .map((c: { frage: string; cloze_text: string | null }) => c.frage || c.cloze_text || '')
          .filter(Boolean)
          .slice(0, 30)
          .map((q: string) => `- ${q.slice(0, 80)}`)
          .join('\n')

        duplicateHint = `\n\nBEREITS VORHANDENE KARTEN (erstelle KEINE ähnlichen):
${existingList}`
      }
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer())

    const dynamicSystemPrompt =
      SYSTEM_PROMPT_BASE +
      kursKontext +
      duplicateHint +
      '\n' +
      getKartentypInstructions(clozeProzent, batchSize)

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let userContent: Anthropic.MessageParam['content']

    if (useVision) {
      const pdfBase64 = pdfBuffer.toString('base64')
      let userText = `Analysiere alle Folien strategisch und erstelle Flashcards. Richtwert: ~${batchSize} Karten — aber entscheide selbst was sinnvoll ist. Berücksichtige Text, Grafiken und Diagramme.`
      if (conceptsList && conceptsList.length > 0) {
        userText += `\n\nFokus auf diese Schlüsselkonzepte:\n${conceptsList.map(c => `- ${c}`).join('\n')}`
      }
      if (pageFrom && pageTo) userText += ` Seiten ${pageFrom}–${pageTo}.`
      else if (pageFrom) userText += ` Ab Seite ${pageFrom}.`
      else if (pageTo) userText += ` Bis Seite ${pageTo}.`
      userContent = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } } as Anthropic.DocumentBlockParam,
        { type: 'text', text: userText },
      ]
    } else {
      let pageTexts: string[] = []
      try {
        pageTexts = await extractPageTexts(pdfBuffer)
      } catch {
        const fallback = await pdf(pdfBuffer)
        pageTexts = [fallback.text]
      }

      const totalPages = pageTexts.length
      const fromIdx = pageFrom ? Math.max(0, parseInt(pageFrom) - 1) : 0
      const toIdx = pageTo ? Math.min(totalPages - 1, parseInt(pageTo) - 1) : totalPages - 1
      const relevantPages = pageTexts.slice(fromIdx, toIdx + 1)
      const pageText = relevantPages
        .map((text, i) => `--- Seite ${fromIdx + i + 1} ---\n${text.trim()}`)
        .join('\n\n')

      const basePrompt = `Analysiere diesen Folientext strategisch und erstelle Flashcards. Richtwert: ~${batchSize} Karten (Seiten ${fromIdx + 1}–${toIdx + 1}) — aber entscheide selbst was sinnvoll ist.`

      if (conceptsList && conceptsList.length > 0) {
        userContent = `${basePrompt}\n\nFokus auf diese Schlüsselkonzepte:\n${conceptsList.map(c => `- ${c}`).join('\n')}\n\nFolientext:\n${pageText}`
      } else {
        userContent = `${basePrompt}\n\n${pageText}`
      }
    }

    let allCards: RawCard[] = []

    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system: dynamicSystemPrompt,
        messages: [{ role: 'user', content: userContent }],
      })

      const cost_usd = await logApiUsage(supabase, {
        feature: 'generieren',
        model: 'claude-sonnet-4-6',
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        themaId: Number(themaId),
        userId: user.id,
      })
      await incrementCreditsUsed(supabase, user.id, cost_usd)

      const raw = (message.content[0] as { type: 'text'; text: string }).text
      try {
        allCards = parseJson(raw)
        // Soft cap: allow ±40% around batchSize, but don't hard-cut good cards
        const softMax = Math.round(batchSize * 1.4)
        if (allCards.length > softMax && batchSize > 0) {
          const downsampled: RawCard[] = []
          for (let i = 0; i < softMax; i++) {
            const idx = Math.floor((i * allCards.length) / softMax)
            downsampled.push(allCards[idx])
          }
          allCards = downsampled
        }
      } catch {
        console.error('[generieren] JSON-Parse-Fehler:', raw.slice(0, 200))
        return NextResponse.json(
          { error: 'Claude hat kein gültiges JSON zurückgegeben. Bitte erneut versuchen.' },
          { status: 500 }
        )
      }
    } catch (claudeError) {
      console.error('[generieren] Claude API Fehler:', claudeError)
      return NextResponse.json(
        { error: `Claude API Fehler: ${claudeError instanceof Error ? claudeError.message : String(claudeError)}` },
        { status: 500 }
      )
    }

    const kartenInsert = allCards.map((card) => ({
      thema_id: Number(themaId),
      typ: card.typ === 'cloze' ? 'cloze' : 'basic',
      frage: card.frage ?? '',
      antwort: card.antwort ?? '',
      cloze_text: card.cloze_text || null,
      kontext: card.kontext_erklaerung || null,
      slide_nr: card.slide_nummer ?? null,
      tags: card.tags ?? [],
      status: 'neu',
    }))

    return NextResponse.json({ karten: kartenInsert, count: kartenInsert.length })
  } catch (error) {
    console.error('[generieren] Unerwarteter Fehler:', error)
    return NextResponse.json(
      { error: `Serverfehler: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
