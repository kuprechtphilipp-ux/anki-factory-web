import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  const now = new Date()
  const today = toDateStr(now)
  const yesterday = toDateStr(new Date(now.getTime() - 86_400_000))

  // Last 60 days of streak data
  const since = new Date(now)
  since.setDate(since.getDate() - 59)
  const { data: rows } = await supabase
    .from('lern_streak')
    .select('datum, karten_gelernt')
    .gte('datum', toDateStr(since))
    .order('datum', { ascending: false })

  const map: Record<string, number> = {}
  for (const r of rows ?? []) {
    map[r.datum] = r.karten_gelernt
  }

  const learnedToday = !!(map[today] && map[today] > 0)

  // Compute streak
  let streak = 0
  const startDay = learnedToday ? today : (map[yesterday] ? yesterday : null)
  if (startDay) {
    let cursor = new Date(startDay + 'T12:00:00Z')
    while (true) {
      const ds = toDateStr(cursor)
      if (!map[ds] || map[ds] === 0) break
      streak++
      cursor = new Date(cursor.getTime() - 86_400_000)
    }
  }

  // Total due cards across all themen
  const { count: dueCount } = await supabase
    .from('karte')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'reviewed')
    .lte('fsrs_due', now.toISOString())

  return NextResponse.json({ streak, learnedToday, dueCount: dueCount ?? 0 })
}
