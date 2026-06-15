import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { logApiUsage, getCreditStatus, CREDITS_EXHAUSTED_MESSAGE, usdToCredits } from '@/lib/api-cost'
import { getKursAltklausurDocs } from '@/lib/altklausur-kontext'

export const maxDuration = 30

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const creditStatus = await getCreditStatus(supabase, user.id)
  if (creditStatus.exhausted) {
    return NextResponse.json({ error: 'credits_exhausted', message: CREDITS_EXHAUSTED_MESSAGE }, { status: 402 })
  }

  const { frage, musterantwort, nutzerantwort, kontext, kurs_id } = await req.json() as {
    frage: string
    musterantwort: string
    nutzerantwort: string
    kontext?: string
    kurs_id?: number
  }

  if (!frage || !musterantwort || !nutzerantwort) {
    return NextResponse.json({ error: 'frage, musterantwort und nutzerantwort erforderlich' }, { status: 400 })
  }

  const contextBlock = kontext ? `\nContext: ${kontext}` : ''
  const altklausurDocs = kurs_id != null ? await getKursAltklausurDocs(supabase, kurs_id) : []
  const altklausurBlock = altklausurDocs.length > 0
    ? `\n\nPAST EXAM REFERENCE (${altklausurDocs.length} document${altklausurDocs.length > 1 ? 's' : ''}): Use the following excerpts from past exams of this course to judge how detailed/complete an answer needs to be to satisfy this course's exam expectations. These documents may not cover this specific topic directly, use them only as a general calibration of expected depth and rigor.\n\n${altklausurDocs.map((doc, i) => `--- Exam ${i + 1} ---\n${doc}`).join('\n\n')}`
    : ''

  const prompt = `You are evaluating a student's answer against a model answer for a flashcard.

Question: ${frage}
Model answer: ${musterantwort}${contextBlock}
Student's answer: ${nutzerantwort}${altklausurBlock}

Rate the answer on a 0–100 scale:
- 90–100: Completely correct, all key points covered
- 70–89: Mostly correct, minor omissions
- 50–69: Partially correct, key concepts present but incomplete
- 30–49: Some relevant content but major gaps
- 0–29: Incorrect or irrelevant

IMPORTANT: Write the feedback in the same language as the question and model answer.
Do not use em dashes ("—") in the feedback. Use normal punctuation (period, comma, colon) or a conjunction instead.
korrekt = true if score >= 60.

Respond ONLY with valid JSON: {"score":85,"feedback":"Short, constructive feedback (1–2 sentences)","korrekt":true}`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const cost_usd = await logApiUsage(supabase, {
      feature: 'schriftlich',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: msg.usage.input_tokens,
      outputTokens: msg.usage.output_tokens,
      userId: user.id,
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const result = JSON.parse(jsonMatch[0]) as { score: number; feedback: string; korrekt: boolean }
    return NextResponse.json({ ...result, credits: usdToCredits(cost_usd) })
  } catch {
    return NextResponse.json({ score: 50, feedback: '', korrekt: false, credits: 0 }, { status: 200 })
  }
}
