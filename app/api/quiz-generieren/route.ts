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
  const { thema_id, kurs_name, anzahl = 10, schwierigkeit = 'mittel' } = body as {
    thema_id?: number
    kurs_name?: string
    anzahl?: number
    schwierigkeit?: 'leicht' | 'mittel' | 'schwer'
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

  const schwierigkeitInstruktion = {
    leicht: `DISTRACTOR RULE (Leicht): Wrong answers come from a related but clearly distinct area of the subject. A student with basic knowledge can identify them as wrong.`,
    mittel: `DISTRACTOR RULE (Mittel): Wrong answers must sound like they could plausibly appear in a textbook or lecture on the same topic. They should use correct domain terminology. A student who has skimmed the material but not studied deeply should find all options believable.`,
    schwer: `DISTRACTOR RULE (Schwer/Hard): Wrong answers must be from the exact same sub-category as the correct answer. Each wrong answer differs from the correct one by exactly ONE critical detail — a swapped relationship, a reversed direction of causality, a wrong number, a negation, or a subtly incorrect qualifier. Exploit common misconceptions. A student who superficially understood the topic WILL pick a wrong answer.`,
  }[schwierigkeit]

  const systemPrompt = `You are an expert quiz generator. Create multiple-choice questions from the given flashcards.

UNIVERSAL RULES (apply to every question regardless of difficulty):
1. LANGUAGE: Use exactly the same language as the flashcard content. Match it precisely — do not translate.
2. OPTION LENGTH PARITY: All 4 answer options MUST be approximately the same length and level of detail. The correct answer must NOT be noticeably longer, more complete, or better-structured than the wrong ones. If the correct answer is a long sentence, all distractors must also be long sentences of similar complexity.
3. NO OBVIOUS FILLERS: Wrong answers must never sound absurd, trivially false, or like placeholder text. Every option must read as something a real course or textbook could plausibly state.
4. NO GIVEAWAY PATTERNS: Never make the correct answer the only one that uses specific terminology from the card. Never use "only X", "never X", or "always X" as obviously wrong traps. The correct answer must not stand out by being the most complete or best-worded option.
5. ANSWER COUNT: Exactly 4 options per question (A, B, C, D). Exactly 1 correct answer.
6. QUESTION QUALITY: The question must test real understanding, not just pattern-matching to the wording of the card.

${schwierigkeitInstruktion}

Return ONLY a JSON array, no markdown, no text outside the JSON:
[{"frage":"...","optionen":["A: ...","B: ...","C: ...","D: ..."],"richtig":0,"erklaerung":"Short explanation why the correct answer is right, in the same language as the cards","karte_id":123}]`

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
