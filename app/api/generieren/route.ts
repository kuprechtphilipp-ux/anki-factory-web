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
- Vergib für jede Karte 1-3 passende, kurze Anki-Tags (z.B. "definition", "formel", "beispiel", "klausurrelevant"). Ohne "#" Symbol.

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
    "tags": ["tag1"]
  },
  {
    "typ": "cloze",
    "frage": "",
    "antwort": "",
    "cloze_text": "...",
    "kontext_erklaerung": "...",
    "slide_nummer": <int>,
    "tags": ["tag1"]
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
    const lod = (formData.get('lod') as string) ?? 'Mittel'
    const themaId = formData.get('thema_id')

    if (!file) {
      return NextResponse.json({ error: 'Kein PDF hochgeladen (field: pdf)' }, { status: 400 })
    }
    if (!themaId) {
      return NextResponse.json({ error: 'thema_id fehlt' }, { status: 400 })
    }

    const pageFrom = (formData.get('page_from') as string | null) || null
    const pageTo = (formData.get('page_to') as string | null) || null

    const pdfBuffer = Buffer.from(await file.arrayBuffer())

    // Extract text per page — avoids sending full binary PDF to Claude each batch
    let pageTexts: string[] = []
    try {
      pageTexts = await extractPageTexts(pdfBuffer)
    } catch {
      // Fallback: extract full text if per-page extraction fails
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

    const dynamicSystemPrompt =
      SYSTEM_PROMPT +
      '\n\nDETAILGRAD-ANWEISUNG:\n' +
      (LOD_INSTRUCTIONS[lod] ?? LOD_INSTRUCTIONS['Mittel'])

    const batchSize = parseInt((formData.get('batch_size') as string) ?? '20') || 20

    const userText = `Analysiere den folgenden Folientext (Seiten ${fromIdx + 1}–${toIdx + 1}) und erstelle ca. ${batchSize} Flashcards. Erstelle nicht mehr als ${batchSize} Karten — passe die Tiefe und Granularität an, um diese Zahl zu erreichen.\n\n${pageText}`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let allCards: RawCard[] = []

    try {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system: dynamicSystemPrompt,
        messages: [
          {
            role: 'user',
            content: userText,
          },
        ],
      })

      const raw = (message.content[0] as { type: 'text'; text: string }).text
      try {
        allCards = parseJson(raw)
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
