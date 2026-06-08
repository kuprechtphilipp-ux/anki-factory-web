import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300 // 5 Minuten — Claude PDF-Analyse kann bei großen Decks lange dauern

const SYSTEM_PROMPT = `Du bist ein Elite-Tutor und Didaktik-Experte.
Regeln:
- Eine Karte = ein Konzept
- Frage testet Verständnis, nicht Auswendiglernen
- Antwort max. 3 Zeilen
- Bei Formeln immer mit Intuition ("warum gilt das?")
- Kein "laut Folie X"
- WICHTIG: Erkenne die Sprache des Folientexts und erstelle alle Karten (frage, antwort, kontext_erklaerung) konsequent in genau dieser Sprache. Wechsle die Sprache nicht, auch wenn du auf Deutsch angesprochen wirst.
- Vergib für jede Karte 1-3 passende, kurze Anki-Tags (z.B. "definition", "formel", "beispiel", "klausurrelevant"). Ohne "#" Symbol.

Du siehst das vollständige PDF mit allen Folien — Text UND Grafiken/Bilder. Nutze beides:
Entscheide für jede Information selbst den besten Kartentyp:
- 'basic': Klassische Frage/Antwort Karte.
- 'cloze': Lückentext. Nutze dies für wichtige Definitionen oder Aufzählungen. Syntax: "Die Hauptstadt von {{c1::Frankreich}} ist {{c2::Paris}}."
Entscheide ebenfalls, ob das Bild/Diagramm einer Folie zum Verständnis der Karte WICHTIG ist oder einen starken visuellen Eindruck vermittelt (z.B. ein Foto einer Favela bei Urban Marginalization, ein Diagramm eines Prozesses). Wenn ja, setze medien_sinnvoll: true und beziehe das Bild aktiv in die Frage mit ein (z.B. "Welches Phänomen zeigt dieses Bild?" oder "Was zeigt das Diagramm auf dieser Folie?").

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

    const pdfBuffer = Buffer.from(await file.arrayBuffer())
    const pdfBase64 = pdfBuffer.toString('base64')

    const dynamicSystemPrompt =
      SYSTEM_PROMPT +
      '\n\nDETAILGRAD-ANWEISUNG:\n' +
      (LOD_INSTRUCTIONS[lod] ?? LOD_INSTRUCTIONS['Mittel'])

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
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: pdfBase64,
                },
              } as Anthropic.DocumentBlockParam,
              {
                type: 'text',
                text: 'Analysiere alle Folien in diesem PDF und erstelle Flashcards. Berücksichtige dabei sowohl den Text als auch alle Grafiken, Diagramme und Bilder.',
              },
            ],
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
