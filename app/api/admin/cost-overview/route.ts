import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { usdToCredits, PRICING } from '@/lib/api-cost'

interface UsageRow {
  feature: string
  model: string
  cost_usd: number
}

export async function GET() {
  const ctx = await requireAdmin()
  if ('error' in ctx) return ctx.error
  const { supabase } = ctx

  const { data, error } = await supabase
    .from('api_usage')
    .select('feature, model, cost_usd')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const groups = new Map<string, { feature: string; model: string; costs: number[] }>()
  for (const row of data as UsageRow[]) {
    const key = `${row.feature}::${row.model}`
    if (!groups.has(key)) groups.set(key, { feature: row.feature, model: row.model, costs: [] })
    groups.get(key)!.costs.push(row.cost_usd)
  }

  const overview = Array.from(groups.values())
    .map(({ feature, model, costs }) => {
      const sum = costs.reduce((a, b) => a + b, 0)
      const avgCostUsd = sum / costs.length
      const avgCredits = costs.reduce((a, b) => a + usdToCredits(b), 0) / costs.length
      return {
        feature,
        model,
        calls: costs.length,
        avgCostUsd,
        avgCredits,
        minCostUsd: Math.min(...costs),
        maxCostUsd: Math.max(...costs),
      }
    })
    .sort((a, b) => a.feature.localeCompare(b.feature) || a.model.localeCompare(b.model))

  return NextResponse.json({ overview, pricing: PRICING })
}
