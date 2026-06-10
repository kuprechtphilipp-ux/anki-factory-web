import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface UsageRow {
  id: number
  created_at: string
  feature: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

export async function GET() {
  const { data, error } = await supabase
    .from('api_usage')
    .select('id, created_at, feature, model, input_tokens, output_tokens, cost_usd')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as UsageRow[]

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7)) // Montag
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  let heute = 0
  let woche = 0
  let monat = 0
  let gesamt = 0

  const proFeatureMap = new Map<string, { cost: number; calls: number }>()
  const proTagMap = new Map<string, number>()

  for (const row of rows) {
    const cost = Number(row.cost_usd)
    const created = new Date(row.created_at)

    gesamt += cost
    if (created >= startOfToday) heute += cost
    if (created >= startOfWeek) woche += cost
    if (created >= startOfMonth) monat += cost

    const f = proFeatureMap.get(row.feature) ?? { cost: 0, calls: 0 }
    f.cost += cost
    f.calls += 1
    proFeatureMap.set(row.feature, f)

    const day = row.created_at.slice(0, 10)
    proTagMap.set(day, (proTagMap.get(day) ?? 0) + cost)
  }

  const proFeature = Array.from(proFeatureMap.entries())
    .map(([feature, { cost, calls }]) => ({ feature, cost, calls }))
    .sort((a, b) => b.cost - a.cost)

  // Letzte 30 Tage, fehlende Tage mit 0 auffüllen
  const proTag: { date: string; cost: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(startOfToday)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    proTag.push({ date: key, cost: proTagMap.get(key) ?? 0 })
  }

  const letzteAufrufe = rows.slice(0, 20)

  return NextResponse.json({
    heute,
    woche,
    monat,
    gesamt,
    proFeature,
    proTag,
    letzteAufrufe,
  })
}
