import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { logApiUsage, getCreditStatus, CREDITS_EXHAUSTED_MESSAGE, usdToCredits } from '@/lib/api-cost'

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

  const { frage, musterantwort, nutzerantwort, kontext, altklausur_kontext } = await req.json() as {
    frage: string
    musterantwort: string
    nutzerantwort: string
    kontext?: string
    altklausur_kontext?: string
  }

  if (!frage || !musterantwort || !nutzerantwort) {
    return NextResponse.json({ error: 'frage, musterantwort und nutzerantwort erforderlich' }, { status: 400 })
  }

  const contextBlock = kontext ? `\nContext: ${kontext}` : ''
  const altklausurBlock = altklausur_kontext
    ? `\n\nPAST EXAM REFERENCE for this topic (use it to judge how detailed/complete an answer needs to be to satisfy this exam's expectations):\n${altklausur_kontext.slice(0, 6000)}`
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
