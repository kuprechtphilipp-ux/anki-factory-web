import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import pdf from 'pdf-parse'

export const maxDuration = 300 // Pro: 300s, Hobby: hard-capped at 60s

const SYSTEM_PROMPT = `Du bist ein Elite-Tutor und Didaktik-Experte.
Regeln:
- Eine Karte = ein Konzept
- Frage testet Verständnis, nicht Auswendiglernen
- Antwort max. 3 Zeilen
- Bei Formeln immer mit Intuition ("warum gilt das?")
- Kein "laut Folie X"
- WICHTIG: Erkenne die Sprache des Folientexts und erstelle alle Karten (frage, antwort, kontext_erklaerung) konsequent in genau dieser Sprache. Wechsle die Sprache nicht, auch wenn du auf Deutsch angesprochen wirst.
- WICHTIG ZU TAGS: Jedes tags-Array MUSS als ersten Eintrag entweder "core" oder "detail" enthalten:
  * "core": Essentielles Grundlagenwissen, Kern-Definitionen, Hauptformeln, absolut notwendig zum Bestehen der Prüfung.
  * "detail": Hintergrundwissen, Herleitungen, ergänzende Beispiele, Vertiefungen.
- WICHTIG ZU FOKUS: Kennzeichne zusätzlich maximal 10–15 % der allerwichtigsten, typischsten Prüfungsfragen mit einem zweiten Tag "fokus" (z.B. ["core", "fokus", "definition"]). Sei extrem restriktiv: Nur absolute Schlüsselkarten, die fast sicher in der Prüfung abgefragt werden, erhalten den Tag "fokus".
- Vergib danach 1-2 weitere passende, kurze Anki-Tags (z.B. "definition", "formel", "beispiel"). Ohne "#" Symbol.

Du erhältst den extrahierten Text der Folien, seitenweise strukturiert.
Entscheide für jede Information selbst den besten Kartentyp:
- 'basic': Klassische Frage/Antwort Karte.
- 'cloze': Lückentext. Nutze dies für wichtige Definitionen oder Aufzählungen. Syntax: "Die Hauptstadt von {{c1::Frankreich}} ist {{c2::Paris}}."

Gib ausschließlich ein JSON-Array zurück, kein Markdown, kein Kommentar:
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

function getKartentypInstructions(clozeProzent: number, limit: number): string {
  const basicProzent = 100 - clozeProzent
  if (clozeProzent >= 60) {
    return `KARTENTYP-MIX: Erstelle ~${clozeProzent}% Cloze-Karten und ~${basicProzent}% Basic-Karten. Cloze eignet sich optimal für Definitionen, Fachbegriffe, Aufzählungen und Prozessschritte — nutze ihn dort konsequent. Maximal ${limit} Karten insgesamt.`
  } else if (clozeProzent <= 30) {
    return `KARTENTYP-MIX: Erstelle ~${basicProzent}% Basic-Karten und ~${clozeProzent}% Cloze-Karten. Nutze Basic für konzeptuelle Verständnisfragen, Formeln mit Intuition ("warum gilt das?") und Kausalzusammenhänge. Maximal ${limit} Karten insgesamt.`
  } else {
    return `KARTENTYP-MIX: Ausgewogener Mix – ~${clozeProzent}% Cloze für Schlüsselbegriffe und Definitionen, ~${basicProzent}% Basic für konzeptuelle Fragen und Zusammenhänge. Maximal ${limit} Karten insgesamt.`
  }
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

// Extract text per page using pdf-parse pagerender callback
async function extractPageTexts(buffer: Buffer): Promise<string[]> {
  const pages: string[] = []

  await pdf(buffer, {
    pagerender(pageData: { getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) {
      return pageData.getTextContent().then((content) => {
        const text = content.items.map((item) => item.str).join(' ')
        pages.push(text)
        return text
      })
    },
  } as Parameters<typeof pdf>[1])

  return pages
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY nicht gesetzt' }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File | null
    const clozeProzent = Math.min(80, Math.max(20, parseInt((formData.get('cloze_anteil') as string) ?? '50') || 50))
    const themaId = formData.get('thema_id')

    if (!file) {
      return NextResponse.json({ error: 'Kein PDF hochgeladen (field: pdf)' }, { status: 400 })
    }
    if (!themaId) {
      return NextResponse.json({ error: 'thema_id fehlt' }, { status: 400 })
    }

    const pageFrom = (formData.get('page_from') as string | null) || null
    const pageTo = (formData.get('page_to') as string | null) || null
    const useVision = (formData.get('vision') as string) === 'true'

    const batchSize = parseInt((formData.get('batch_size') as string) ?? '20') || 20
    const conceptsRaw = formData.get('concepts') as string | null
    const conceptsList = conceptsRaw ? (JSON.parse(conceptsRaw) as string[]) : null

    const pdfBuffer = Buffer.from(await file.arrayBuffer())

    const dynamicSystemPrompt =
      SYSTEM_PROMPT +
      '\n\nKARTENTYP-ANWEISUNG:\n' +
      getKartentypInstructions(clozeProzent, batchSize)

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let userContent: Anthropic.MessageParam['content']

    if (useVision) {
      // Vision mode: send full PDF as base64, Claude processes text + images
      const pdfBase64 = pdfBuffer.toString('base64')
      let userText = `Analysiere alle Folien in diesem PDF und erstelle ca. ${batchSize} Flashcards. Erstelle nicht mehr als ${batchSize} Karten — passe die Tiefe und Granularität an, um diese Zahl zu erreichen. Berücksichtige sowohl Text als auch Grafiken, Diagramme und Bilder.`
      if (conceptsList && conceptsList.length > 0) {
        userText += `\n\nFokussiere dich AUSSCHLIESSLICH auf die folgenden Schlüsselkonzepte und erstelle für jedes Konzept entsprechende Karten. Ignoriere andere Themen vollkommen:\n${conceptsList.map(c => `- ${c}`).join('\n')}`
      }
      if (pageFrom && pageTo) userText += ` Analysiere NUR die Seiten ${pageFrom} bis ${pageTo}.`
      else if (pageFrom) userText += ` Beginne ab Seite ${pageFrom}.`
      else if (pageTo) userText += ` Analysiere nur bis einschließlich Seite ${pageTo}.`
      userContent = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } } as Anthropic.DocumentBlockParam,
        { type: 'text', text: userText },
      ]
    } else {
      // Text mode: extract text per page, send only relevant range — faster, no vision
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

      if (conceptsList && conceptsList.length > 0) {
        userContent = `Analysiere den folgenden Folientext (Seiten ${fromIdx + 1}–${toIdx + 1}) und erstelle ca. ${batchSize} Flashcards. Erstelle nicht mehr als ${batchSize} Karten — passe die Tiefe und Granularität an, um diese Zahl zu erreichen.

Fokussiere dich AUSSCHLIESSLICH auf die folgenden Schlüsselkonzepte und erstelle für jedes Konzept entsprechende Karten. Ignoriere andere Themen vollkommen:
${conceptsList.map(c => `- ${c}`).join('\n')}

Folientext:
${pageText}`
      } else {
        userContent = `Analysiere den folgenden Folientext (Seiten ${fromIdx + 1}–${toIdx + 1}) und erstelle ca. ${batchSize} Flashcards. Erstelle nicht mehr als ${batchSize} Karten — passe die Tiefe und Granularität an, um diese Zahl zu erreichen.\n\n${pageText}`
      }
    }

    let allCards: RawCard[] = []

    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system: dynamicSystemPrompt,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
      })

      const raw = (message.content[0] as { type: 'text'; text: string }).text
      try {
        allCards = parseJson(raw)
        
        // Server-side Downsampling Guardrail: Ensure we do not return more cards than batchSize
        if (allCards.length > batchSize && batchSize > 0) {
          const downsampled: RawCard[] = []
          for (let i = 0; i < batchSize; i++) {
            const idx = Math.floor((i * allCards.length) / batchSize)
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
