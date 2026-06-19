import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import pdf from 'pdf-parse'
import { createClient } from '@/lib/supabase/server'
import { logApiUsage, getCreditStatus, CREDITS_EXHAUSTED_MESSAGE } from '@/lib/api-cost'

export const maxDuration = 60

// Variante des Pre-Scans für "Komplexe visuelle Folien"-Decks (Test-Feature):
// Analysiert den extrahierten Folientext statt das PDF als Vision-Dokument.
// Deutlich schneller/günstiger bei vielen Seiten, riskiert kein 60s-Timeout.
const PRESCAN_SYSTEM = `Du bist ein Lernstratege für Hochschulprüfungen.

DEINE AUFGABE:
Analysiere dieses Dokument vollständig als Ganzes — nicht Seite für Seite.
Verstehe was das Thema ist, was wichtig ist und was weggelassen werden kann.
Entwickle eine Lernstrategie: Was muss ein Student lernen um diese Prüfung zu bestehen?

WICHTIG: Nutze dein Wissen über typische Bachelor-Studiengänge. Du kennst welche Konzepte in welchen Fächern prüfungsrelevant sind — lass dieses Wissen einfließen.
Der Folientext kann lückenhaft sein (z.B. bei Folien mit viel Grafik/Struktur und wenig Fliesstext). Nutze Stichworte, Begriffe und Zahlen als Anhaltspunkte und ergänze mit deinem Fachwissen.

KARTENMENGE — Bestimme die optimale Anzahl basierend auf:
- Wie viele unabhängige, prüfungsrelevante Konzepte gibt es wirklich?
- Pareto-Prinzip: 20% der Karten sollen 80% der Prüfungsvorbereitung abdecken
- Richtwert: 10–20 Karten für ein Standard-Thema, nur mehr wenn inhaltlich zwingend nötig
- Lieber 12 präzise Karten als 25 mittelmässige

SCHREIBSTIL: Verwende in allen Textfeldern keine Gedankenstriche ("—"). Formuliere stattdessen mit Punkt, Komma, Doppelpunkt oder einer Konjunktion.

Gib NUR dieses JSON-Objekt zurück, kein Markdown, kein Text davor oder danach:
{
  "thema": "kurzer Titel des Themas (max 5 Wörter)",
  "fachtyp": "definitionen|konzepte|formeln",
  "fachtyp_label": "z.B. 'Betriebswirtschaft / Begriffe' oder 'Statistik / Formeln'",
  "seitenanzahl": <int>,
  "textdichte": "gering|mittel|hoch",
  "komplexitaet": "gering|mittel|hoch",
  "sprache": "de|en|andere",
  "strategie": {
    "kern_konzepte": ["Konzept A", "Konzept B", "Konzept C"],
    "lernreihenfolge": "1–2 Sätze: womit anfangen, was baut worauf an",
    "was_weglassen": "1 Satz: was ist zu detailliert oder ableitbar für eigene Karten"
  },
  "empfehlung": {
    "kartenmenge": <int, von Claude bestimmt>,
    "cloze_anteil": <int zwischen 20 und 80>,
    "kartentyp_begruendung": "1 prägnanter Satz warum dieser Kartentyp-Mix",
    "begruendung": "1–2 Sätze zur empfohlenen Kartenmenge und Lernstrategie"
  },
  "batches": [
    {
      "von": <int>,
      "bis": <int>,
      "label": "kurze thematische Beschreibung",
      "karten": <int>,
      "schluesselkonzepte": ["konzept1", "konzept2", "konzept3"]
    }
  ]
}

Fachtyp-Regeln:
- "definitionen": Viele Fachbegriffe, Definitionen, Prozesse (BWL, Jura, Medizin) → cloze_anteil 60–80
- "konzepte": Theorien, Modelle, Zusammenhänge (Psychologie, VWL, Soziologie) → cloze_anteil 35–55
- "formeln": Mathematische Formeln, Algorithmen, Berechnungen (Mathe, Statistik, Informatik) → cloze_anteil 20–35

Batch-Regel: Splitte das PDF in sinnvolle Batches von maximal 20 Seiten. Wenn das PDF ≤ 22 Seiten hat, erstelle genau 1 Batch für das gesamte Dokument.
Verteile kartenmenge inhaltlich gewichtet. Die Summe aller Batch-karten = empfohlene kartenmenge.
Jeder Batch MUSS ein Array "schluesselkonzepte" mit 3–5 konkreten, prüfungsrelevanten Begriffen enthalten.`

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
    const body = await req.json()
    const pdfStoragePath = body.pdfStoragePath as string | null
    if (!pdfStoragePath) return NextResponse.json({ error: 'Kein PDF' }, { status: 400 })
    if (!pdfStoragePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const themaId = body.thema_id as string | null

    // Load kurs context if thema_id is provided
    let kursKontext = ''
    if (themaId) {
      const { data: themaRow } = await supabase
        .from('thema')
        .select('name, kurs_id')
        .eq('id', Number(themaId))
        .single()

      if (themaRow) {
        const { data: kursRow } = await supabase
          .from('kurs')
          .select('name, notiz_kontext')
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
Dieser Kurs heisst "${kursRow.name}".
${andereThemen.length > 0 ? `Weitere Themen dieses Kurses: ${andereThemen.join(', ')}.` : ''}
Nutze dein Wissen über typische "${kursRow.name}" Bachelor-Kurse um einzuschätzen welche Konzepte prüfungsrelevant sind und wie tief du gehen sollst. Gehe bei Themen, die in anderen Kursthemen behandelt werden, nicht unnötig tief.`

          if (kursRow.notiz_kontext?.trim()) {
            kursKontext += `\n\nNUTZER-HINWEIS ZU DIESEM KURS (unbedingt berücksichtigen):
${kursRow.notiz_kontext.trim()}`
          }
        }
      }
    }

    // Load user preference profile
    const { data: profil } = await supabase
      .from('generier_profil')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from('temp-pdfs')
      .download(pdfStoragePath)
    if (downloadError || !pdfBlob) {
      return NextResponse.json({ error: 'PDF konnte nicht aus Storage geladen werden' }, { status: 404 })
    }
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

    let pageTexts: string[] = []
    try {
      pageTexts = await extractPageTexts(pdfBuffer)
    } catch {
      const fallback = await pdf(pdfBuffer)
      pageTexts = [fallback.text]
    }

    const documentText = pageTexts
      .map((text, i) => `--- Seite ${i + 1} ---\n${text.trim()}`)
      .join('\n\n')

    let systemPrompt = PRESCAN_SYSTEM + kursKontext

    if (profil && profil.feedback_count >= 3) {
      systemPrompt += `\n\nNUTZER-PROFIL (basierend auf ${profil.feedback_count} bisherigen Decks):
- Bevorzugter Detailgrad: ${profil.bevorzugter_detailgrad}
- Bevorzugte Kartenmenge: ~${profil.bevorzugte_kartenmenge} Karten
- Bevorzugter Kartentyp: ${profil.bevorzugter_kartentyp}
${profil.notizen.length > 0 ? `- Hinweise aus Feedback: ${profil.notizen.slice(-3).join('; ')}` : ''}
Berücksichtige diese Präferenzen — aber überschreibe sie nicht wenn der Inhalt etwas anderes erfordert.`
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 6000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analysiere diesen Folientext vollständig (${pageTexts.length} Seiten) und gib die Lernstrategie + JSON-Empfehlung zurück.\n\n${documentText}`,
        },
      ],
    })

    await logApiUsage(supabase, {
      feature: 'prescan-text',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      themaId: themaId ? Number(themaId) : null,
      userId: user.id,
    })

    if (message.stop_reason === 'max_tokens') {
      throw new Error('Antwort wurde abgeschnitten (PDF zu gross). Versuche ein kleineres PDF oder teile es in Abschnitte auf.')
    }

    const raw = (message.content[0] as { type: 'text'; text: string }).text
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    // Extract outermost JSON object — handles trailing text das Haiku manchmal nach dem JSON anfügt
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd < jsonStart) {
      throw new Error('Kein gültiges JSON-Objekt in der Antwort gefunden')
    }
    const result = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1))

    return NextResponse.json({
      ...result,
      hatProfil: profil && profil.feedback_count >= 3,
    })
  } catch (error) {
    console.error('[prescan-text]', error)
    return NextResponse.json(
      { error: `Pre-Scan fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
