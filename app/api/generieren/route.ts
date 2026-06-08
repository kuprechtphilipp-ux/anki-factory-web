import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { PDFParse } from 'pdf-parse'

const SYSTEM_PROMPT = `Du bist ein Elite-Tutor und Didaktik-Experte.
Regeln:
- Eine Karte = ein Konzept
- Frage testet Verständnis, nicht Auswendiglernen
- Antwort max. 3 Zeilen
- Bei Formeln immer mit Intuition ("warum gilt das?")
- Kein "laut Folie X"
- WICHTIG: Erkenne die Sprache des Folientexts und erstelle alle Karten (frage, antwort, kontext_erklaerung) konsequent in genau dieser Sprache. Wechsle die Sprache nicht, auch wenn du auf Deutsch angesprochen wirst.
- Vergib für jede Karte 1-3 passende, kurze Anki-Tags (z.B. "definition", "formel", "beispiel", "klausurrelevant"). Ohne "#" Symbol.

Entscheide für jede Information selbst den besten Kartentyp:
- 'basic': Klassische Frage/Antwort Karte.
- 'cloze': Lückentext. Nutze dies für wichtige Definitionen oder Aufzählungen. Syntax: "Die Hauptstadt von {{c1::Frankreich}} ist {{c2::Paris}}."
Entscheide ebenfalls, ob das Bild der Folie zum Verständnis der Karte WICHTIG ist oder einen starken visuellen Eindruck vermittelt (z.B. ein Foto einer Favela bei Urban Marginalization). Wenn ja, setze medien_sinnvoll: true und beziehe das Bild aktiv in die Frage mit ein (z.B. "Welches Phänomen zeigt dieses Bild?").

Gib ausschließlich ein JSON-Array zurück, kein Markdown, kein Kommentar:
[
  {
    "typ": "basic",
    "frage": "...",
    "antwort": "...",
    "cloze_text": "",
    "kontext_erklaerung": "...",
    "slide_nummer": <int>,
    "tags": ["tag1"],
    "medien_sinnvoll": true
  },
  {
    "typ": "cloze",
    "frage": "",
    "antwort": "",
    "cloze_text": "...",
    "kontext_erklaerung": "...",
    "slide_nummer": <int>,
    "tags": ["tag1"],
    "medien_sinnvoll": false
  }
]`

const LOD_INSTRUCTIONS: Record<string, string> = {
  Gering:
    'Pareto 80/20 Regel anwenden! Sei EXTREM restriktiv. Der User lernt kurz vor der Klausur und will nur die 20% der High-Level Konzepte, die 80% des Ergebnisses bringen. Fasse stark zusammen. Erstelle für 10 Folien maximal 1-3 Karten. Ignoriere alle kleinen Details, Beispiele oder tiefen Herleitungen.',
  Mittel:
    'Erstelle eine moderate Anzahl an Karten für die wichtigsten Konzepte. Finde eine gute Balance aus Details und Übersichtlichkeit.',
  Hoch: 'Extrahiere jedes Detail. Erstelle für jede noch so kleine Informationsebene, Definition, Aufzählung oder Fußnote eine eigene atomare Karte. Die Anzahl der Karten ist nicht limitiert.',
}

interface RawCard {
  typ: string
  frage: string
  antwort: string
  cloze_text: string
  kontext_erklaerung: string
  slide_nummer: number
  tags: string[]
  medien_sinnvoll: boolean
}

function parseJson(raw: string): RawCard[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  return JSON.parse(cleaned)
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('pdf') as File | null
  const lod = (formData.get('lod') as string) ?? 'Mittel'
  const themaId = formData.get('thema_id')

  if (!file) {
    return NextResponse.json({ error: 'Kein PDF hochgeladen (field: pdf)' }, { status: 400 })
  }
  if (!themaId) {
    return NextResponse.json({ error: 'thema_id fehlt' }, { status: 400 })
  }

  const batchSize = Math.min(10, Math.max(1, Number(formData.get('batch_size')) || 5))

  const pdfBuffer = Buffer.from(await file.arrayBuffer())

  const parser = new PDFParse({ data: pdfBuffer })
  const parsed = await parser.getText()

  // pdf-parse v2 getText() returns { text, pages } where pages is an array
  // Split by page if pages array is available, otherwise split on form-feed
  let pages: { page_nr: number; text: string }[]

  if (parsed.pages && Array.isArray(parsed.pages)) {
    pages = parsed.pages.map((p: { num: number; text: string }) => ({
      page_nr: p.num,
      text: p.text.trim(),
    }))
  } else {
    const rawText: string = parsed.text ?? ''
    const pageTexts = rawText.split('\f')
    pages = pageTexts.map((text, i) => ({ page_nr: i + 1, text: text.trim() }))
  }

  // Filter out empty pages
  pages = pages.filter((p) => p.text.length > 0)

  const dynamicSystemPrompt =
    SYSTEM_PROMPT +
    '\n\nDETAILGRAD-ANWEISUNG:\n' +
    (LOD_INSTRUCTIONS[lod] ?? LOD_INSTRUCTIONS['Mittel'])

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const allCards: RawCard[] = []

  for (let start = 0; start < pages.length; start += batchSize) {
    const batch = pages.slice(start, start + batchSize)

    let textCombined = ''
    for (const p of batch) {
      textCombined += `=== Seite ${p.page_nr} ===\n${p.text}\n\n`
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: dynamicSystemPrompt,
      messages: [
        {
          role: 'user',
          content: `Erstelle Flashcards für diese Folien. Nutze den Text der Folien als Kontext:\n\n${textCombined}`,
        },
      ],
    })

    const raw = (message.content[0] as { type: 'text'; text: string }).text
    try {
      const cards = parseJson(raw)
      allCards.push(...cards)
    } catch {
      // skip malformed batch silently
    }
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
}
