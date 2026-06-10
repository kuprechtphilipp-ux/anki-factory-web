import type { SupabaseClient } from '@supabase/supabase-js'

// USD pro 1M Tokens
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
}

export function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model]
  if (!pricing) return 0
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output
}

export async function logApiUsage(
  supabase: SupabaseClient,
  { feature, model, inputTokens, outputTokens, themaId, userId }: {
    feature: 'generieren' | 'prescan' | 'quiz' | 'schriftlich'
    model: string
    inputTokens: number
    outputTokens: number
    themaId?: number | null
    userId: string
  }
): Promise<number> {
  const cost_usd = calcCost(model, inputTokens, outputTokens)
  try {
    const { error } = await supabase.from('api_usage').insert({
      feature,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd,
      thema_id: themaId ?? null,
      user_id: userId,
    })
    if (error) console.error('[api-cost] logApiUsage Fehler:', error.message)
  } catch (err) {
    console.error('[api-cost] logApiUsage Fehler:', err)
  }
  return cost_usd
}

// 1 Credit = 1 Cent
export const CREDITS_EXHAUSTED_MESSAGE =
  'Deine Credits sind aufgebraucht. Schreib mir für mehr Credits: philipp.kuprecht@student.unisg.ch'

export async function getCreditStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<{ creditsTotal: number; creditsUsed: number; exhausted: boolean }> {
  const { data } = await supabase
    .from('profiles')
    .select('credits_total, credits_used')
    .eq('id', userId)
    .single()

  const creditsTotal = data?.credits_total ?? 0
  const creditsUsed = data?.credits_used ?? 0
  return { creditsTotal, creditsUsed, exhausted: creditsUsed >= creditsTotal }
}

export async function incrementCreditsUsed(
  supabase: SupabaseClient,
  userId: string,
  costUsd: number
): Promise<void> {
  const credits = Math.ceil(costUsd * 100)
  if (credits <= 0) return
  const { error } = await supabase.rpc('increment_credits_used', { p_user_id: userId, p_amount: credits })
  if (error) console.error('[api-cost] incrementCreditsUsed Fehler:', error.message)
}
