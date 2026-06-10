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
  { feature, model, inputTokens, outputTokens, themaId }: {
    feature: 'generieren' | 'prescan' | 'quiz' | 'schriftlich'
    model: string
    inputTokens: number
    outputTokens: number
    themaId?: number | null
  }
): Promise<void> {
  try {
    const cost_usd = calcCost(model, inputTokens, outputTokens)
    const { error } = await supabase.from('api_usage').insert({
      feature,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd,
      thema_id: themaId ?? null,
    })
    if (error) console.error('[api-cost] logApiUsage Fehler:', error.message)
  } catch (err) {
    console.error('[api-cost] logApiUsage Fehler:', err)
  }
}
