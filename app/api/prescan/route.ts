import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PRESCAN_SYSTEM = `Du bist ein schnelles Analyse-Tool für Lernmaterial.
Analysiere das PDF strukturell und gib eine JSON-Empfehlung zurück. Erstelle KEINE Lernkarten.

Gib NUR dieses JSON-Objekt zurück, kein Markdown, kein Text davor oder danach:
{
  "thema": "kurzer Titel des Themas (max 5 Wörter)",
  "fachtyp": "definitionen|konzepte|formeln",
  "fachtyp_label": "z.B. 'Betriebswirtschaft / Begriffe' oder 'Statistik / Formeln'",
  "seitenanzahl": <int>,
  "textdichte": "gering|mittel|hoch",
  "komplexitaet": "gering|mittel|hoch",
  "sprache": "de|en|andere",
  "empfehlung": {
    "kartenmenge": <int zwischen 10 und 50>,
    "cloze_anteil": <int zwischen 20 und 80>,
    "kartentyp_begruendung": "1 prägnanter Satz warum dieser Kartentyp-Mix",
    "begruendung": "1-2 prägnante Sätze zur empfohlenen Kartenmenge und Strategie"
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
- "definitionen": Viele Fachbegriffe, Definitionen, Prozesse (BWL, Jura, Medizin, Pharmakologie) → cloze_anteil 60–80
- "konzepte": Theorien, Modelle, Zusammenhänge, Argumentationen (Psychologie, VWL, Geschichte, Soziologie) → cloze_anteil 35–55
- "formeln": Mathematische Formeln, Berechnungen, Algorithmen, Beweise (Mathe, Statistik, Physik, Informatik) → cloze_anteil 20–35

Batch-Regel: Splitte das PDF in sinnvolle Batches von maximal 20 Seiten. Wenn das PDF ≤ 22 Seiten hat, erstelle genau 1 Batch für das gesamte Dokument (von 1 bis seitenanzahl).
Verteile die empfohlene kartenmenge inhaltlich gewichtet auf die Batches — dichtere oder konzeptuell reichere Abschnitte bekommen mehr Karten. Die Summe aller Batch-karten soll der empfohlenen kartenmenge entsprechen.
Jeder Batch MUSS ein Array "schluesselkonzepte" mit 3-5 konkreten, wichtigen Begriffen, Definitionen oder Kernthemen dieses Abschnitts enthalten, die für Karteikarten relevant sind.`

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY nicht gesetzt' }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File | null
    if (!file) return NextResponse.json({ error: 'Kein PDF' }, { status: 400 })

    // Load user preference profile for personalized recommendations
    const { data: profil } = await supabase
      .from('generier_profil')
      .select('*')
      .single()

    const pdfBuffer = Buffer.from(await file.arrayBuffer())
    const pdfBase64 = pdfBuffer.toString('base64')

    let systemPrompt = PRESCAN_SYSTEM
    if (profil && profil.feedback_count >= 3) {
      systemPrompt += `\n\nNUTZER-PROFIL (basierend auf ${profil.feedback_count} bisherigen Decks):
- Bevorzugter Detailgrad: ${profil.bevorzugter_detailgrad}
- Bevorzugte Kartenmenge: ~${profil.bevorzugte_kartenmenge} Karten
- Bevorzugter Kartentyp: ${profil.bevorzugter_kartentyp}
${profil.notizen.length > 0 ? `- Hinweise: ${profil.notizen.slice(-3).join('; ')}` : ''}
Berücksichtige diese Präferenzen in deiner Empfehlung.`
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            } as Anthropic.DocumentBlockParam,
            {
              type: 'text',
              text: 'Analysiere dieses Dokument und gib die JSON-Empfehlung zurück.',
            },
          ],
        },
      ],
    })

    const raw = (message.content[0] as { type: 'text'; text: string }).text
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const result = JSON.parse(cleaned)

    return NextResponse.json({
      ...result,
      hatProfil: profil && profil.feedback_count >= 3,
    })
  } catch (error) {
    console.error('[prescan]', error)
    return NextResponse.json(
      { error: `Prescan fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    )
  }
}
