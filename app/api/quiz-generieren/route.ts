import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import type { Karte, QuizFrage } from '@/lib/types'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function sampleRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { thema_id, kurs_name, anzahl = 10 } = body as {
    thema_id?: number
    kurs_name?: string
    anzahl?: number
  }

  let query = supabase.from('karte').select('*').eq('status', 'reviewed')

  if (thema_id) {
    query = query.eq('thema_id', Number(thema_id))
  } else if (kurs_name) {
    const { data: kursRow } = await supabase.from('kurs').select('id').eq('name', kurs_name).single()
    if (!kursRow) return NextResponse.json({ error: 'Kurs nicht gefunden' }, { status: 404 })
    const { data: themen } = await supabase.from('thema').select('id').eq('kurs_id', kursRow.id)
    const themaIds = (themen ?? []).map((t: { id: number }) => t.id)
    if (themaIds.length === 0) return NextResponse.json({ error: 'Keine Themen gefunden' }, { status: 422 })
    query = query.in('thema_id', themaIds)
  } else {
    return NextResponse.json({ error: 'thema_id oder kurs_name erforderlich' }, { status: 400 })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const karten = (data ?? []) as Karte[]

  if (karten.length < 4) {
    return NextResponse.json({ error: 'Mindestens 4 Karten im Deck nötig' }, { status: 422 })
  }

  const sample = sampleRandom(karten, Math.min(anzahl * 2, karten.length))

  const cardsText = sample.map((k, i) => {
    if (k.typ === 'cloze' && k.cloze_text) {
      return `${i + 1}. [ID: ${k.id}] Lückentext: ${k.cloze_text}`
    }
    return `${i + 1}. [ID: ${k.id}] Frage: ${k.frage}\nAntwort: ${k.antwort}`
  }).join('\n\n')

  const systemPrompt = `You are a quiz generator. Create multiple-choice questions from the given flashcards.
Rules:
- CRITICAL: Use exactly the same language as the flashcard content. If cards are in English, write in English. If in German, write in German. Match the language precisely.
- Exactly 4 answer options per question (A, B, C, D)
- Exactly 1 correct answer
- The 3 wrong options must sound plausible (from the same subject area)
- No questions that can be trivially answered by their wording
- Return ONLY a JSON array, no markdown, no explanations outside the JSON:
[{"frage":"...","optionen":["A: ...","B: ...","C: ...","D: ..."],"richtig":0,"erklaerung":"Short explanation in the same language as the cards","karte_id":123}]`

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Create exactly ${anzahl} multiple-choice questions from these ${sample.length} flashcards. Use the same language as the cards:\n\n${cardsText}`,
    }],
  })

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''

  let fragen: QuizFrage[]
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error('Kein JSON gefunden')
    fragen = JSON.parse(jsonMatch[0]) as QuizFrage[]
  } catch {
    return NextResponse.json({ error: 'Fehler beim Parsen der KI-Antwort' }, { status: 500 })
  }

  return NextResponse.json({ fragen, count: fragen.length })
}
