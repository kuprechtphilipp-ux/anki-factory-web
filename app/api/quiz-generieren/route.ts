import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import type { Karte, QuizFrage } from '@/lib/types'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function cardToText(k: Karte): string {
  if (k.typ === 'cloze' && k.cloze_text) {
    const answer = Array.from(k.cloze_text.matchAll(/\{\{c\d+::([^}]+)\}\}/g)).map(m => m[1]).join('; ')
    const question = k.cloze_text.replace(/\{\{c\d+::([^}]+)\}\}/g, '[...]')
    return `Lückentext: ${question}\nAntwort: ${answer}`
  }
  const parts = [`Frage: ${k.frage}`, `Antwort: ${k.antwort}`]
  if (k.kontext) parts.push(`Kontext: ${k.kontext}`)
  return parts.join('\n')
}

export async function POST(req: Request) {
  const body = await req.json()
  const { thema_id, kurs_name, anzahl = 10, schwierigkeit = 'mittel' } = body as {
    thema_id?: number
    kurs_name?: string
    anzahl?: number
    schwierigkeit?: 'leicht' | 'mittel' | 'schwer'
  }

  // Resolve thema/kurs names for context
  let themaName = ''
  let kursNameResolved = kurs_name ?? ''

  let query = supabase.from('karte').select('*').eq('status', 'reviewed')

  if (thema_id) {
    query = query.eq('thema_id', Number(thema_id))
    const { data: themaRow } = await supabase
      .from('thema')
      .select('name, kurs_id')
      .eq('id', Number(thema_id))
      .single()
    if (themaRow) {
      themaName = themaRow.name
      if (!kursNameResolved) {
        const { data: kursRow } = await supabase.from('kurs').select('name').eq('id', themaRow.kurs_id).single()
        kursNameResolved = kursRow?.name ?? ''
      }
    }
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

  // Split deck: source cards (one question each) + distractor pool (content for wrong answers)
  const pool = shuffle(karten).slice(0, 80)
  const sourceKarten = pool.slice(0, Math.min(anzahl, pool.length))
  const distractorPool = pool.slice(sourceKarten.length)

  const sourceText = sourceKarten
    .map((k, i) => `CARD ${i + 1} [ID: ${k.id}]\n${cardToText(k)}`)
    .join('\n\n')

  const distractorText = distractorPool.length > 0
    ? distractorPool.map((k, i) => `[${i + 1}] ${cardToText(k)}`).join('\n\n')
    : '(keine weiteren Karten)'

  const topicContext = [themaName, kursNameResolved].filter(Boolean).join(' · ')

  const schwierigkeitInstruktion = {
    leicht: `DIFFICULTY — Leicht: Wrong answers come from a clearly adjacent area of the topic. A student with basic knowledge can rule them out.`,
    mittel: `DIFFICULTY — Mittel: Wrong answers are built from real content in the DISTRACTOR POOL. They use correct terminology and sound plausible. A student who skimmed the material should hesitate before choosing.`,
    schwer: `DIFFICULTY — Schwer: Wrong answers are built from real content in the DISTRACTOR POOL and differ from the correct answer by exactly ONE critical detail — a reversed relationship, wrong direction of causality, swapped terms, off-by-one concept, or a common misconception. A student who studied superficially WILL pick a wrong answer.`,
  }[schwierigkeit]

  const systemPrompt = `You are an expert exam question designer. Your goal is to create questions that test genuine conceptual understanding — the kind that appears in university exams — not simple recall of flashcard text.

TOPIC CONTEXT: "${topicContext}"

YOUR TASK:
Generate exactly ${anzahl} multiple-choice questions, one per SOURCE CARD. Each question must:

1. TEST TRANSFER, NOT RECALL: Do not simply restate the card question. Reframe the concept from a different angle — application, consequence, cause, example, or contrast. A student who memorized the card word-for-word should not have an automatic advantage.

2. VARY QUESTION TYPES: Rotate between these types across the quiz:
   - "Was erklärt am besten, warum...?" / "Which best explains why...?"
   - "Welches Beispiel illustriert...?" / "Which example illustrates...?"
   - "Was wäre eine direkte Konsequenz von...?" / "What would be a direct consequence of...?"
   - "Worin unterscheidet sich X von Y?" / "How does X differ from Y?"
   - "Welche Aussage zu [Konzept] ist korrekt?" / "Which statement about [concept] is correct?"
   - "Ein Forscher tut X. Welchem Prinzip folgt er?" / "A researcher does X. Which principle does this follow?"

3. BUILD WRONG ANSWERS FROM THE DISTRACTOR POOL: Use content from the DISTRACTOR POOL cards to construct the 3 wrong options — do not invent plausible-sounding text. This means wrong answers are real concepts from the same course that a student might confuse with the correct answer.

4. OPTION LENGTH PARITY: All 4 options must be the same length and detail level. The correct answer must NOT stand out by being longer, more complete, or better worded.

5. NO GIVEAWAY PATTERNS: The correct answer must not be the only option using specific terminology from the source card. No "only X / never X / always X" traps. No obviously absurd options.

6. LANGUAGE: Match the language of the cards exactly. Do not translate.

${schwierigkeitInstruktion}

Return ONLY a valid JSON array — no markdown, no explanation outside the JSON:
[{"frage":"...","optionen":["A: ...","B: ...","C: ...","D: ..."],"richtig":0,"erklaerung":"One sentence: why the correct answer is right and why it matters. Same language as the cards.","karte_id":123}]`

  const userMessage = `SOURCE CARDS (generate one question per card):

${sourceText}

---

DISTRACTOR POOL (use this content to build wrong answer options — do not generate questions for these cards):

${distractorText}`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
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
