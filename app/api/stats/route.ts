import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET() {
  const now = new Date()
  const today = toDateStr(now)
  const yesterday = toDateStr(new Date(now.getTime() - 86_400_000))

  // Last 365 days
  const since = new Date(now)
  since.setDate(since.getDate() - 364)
  since.setHours(0, 0, 0, 0)

  // Pull lern_streak for heatmap
  const { data: streakRows } = await supabase
    .from('lern_streak')
    .select('datum, karten_gelernt')
    .gte('datum', toDateStr(since))
    .order('datum', { ascending: true })

  const streakMap: Record<string, number> = {}
  for (const r of streakRows ?? []) {
    streakMap[r.datum] = r.karten_gelernt
  }

  // Also pull review_log for retention rate and total count
  const { data: logs } = await supabase
    .from('review_log')
    .select('reviewed_at, rating')
    .gte('reviewed_at', since.toISOString())

  let totalReviews = 0
  let positiveReviews = 0
  const reviewMap: Record<string, number> = {}
  for (const row of logs ?? []) {
    const d = row.reviewed_at.slice(0, 10)
    reviewMap[d] = (reviewMap[d] ?? 0) + 1
    totalReviews++
    if (row.rating >= 3) positiveReviews++
  }

  // Merge: prefer lern_streak, fall back to review_log count
  const allDays = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    return toDateStr(d)
  })

  const heatmapArray = allDays.map((date) => ({
    date,
    count: streakMap[date] ?? reviewMap[date] ?? 0,
  }))

  // Streak from lern_streak (with review_log fallback per day)
  const combinedMap = { ...reviewMap, ...streakMap }
  const learnedToday = !!(combinedMap[today] && combinedMap[today] > 0)
  const startDay = learnedToday ? today : (combinedMap[yesterday] ? yesterday : null)

  let streak = 0
  if (startDay) {
    let cursor = new Date(startDay + 'T12:00:00Z')
    while (true) {
      const ds = toDateStr(cursor)
      if (!combinedMap[ds] || combinedMap[ds] === 0) break
      streak++
      cursor = new Date(cursor.getTime() - 86_400_000)
    }
  }

  // Best streak
  let bestStreak = 0
  let current = 0
  for (const d of allDays) {
    if (combinedMap[d] && combinedMap[d] > 0) {
      current++
      if (current > bestStreak) bestStreak = current
    } else {
      current = 0
    }
  }

  const todayReviews = combinedMap[today] ?? 0

  // Avg cards/day last 30 days
  const last30 = allDays.slice(-30)
  const activeLast30 = last30.filter(d => (combinedMap[d] ?? 0) > 0).length
  const totalLast30 = last30.reduce((sum, d) => sum + (combinedMap[d] ?? 0), 0)
  const avgCardsPerDay = activeLast30 > 0 ? Math.round(totalLast30 / 30) : 0

  // Total cards learned this week
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
  const weekTotal = allDays
    .filter(d => d >= toDateStr(startOfWeek))
    .reduce((sum, d) => sum + (combinedMap[d] ?? 0), 0)

  const { count: totalCards } = await supabase
    .from('karte')
    .select('id', { count: 'exact', head: true })
    .neq('fsrs_reps', 0)

  const retentionRate = totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 100) : 0

  return NextResponse.json({
    streak,
    bestStreak,
    totalReviews,
    todayReviews,
    retentionRate,
    heatmap: heatmapArray,
    totalCards: totalCards ?? 0,
    weekTotal,
    avgCardsPerDay,
  })
}
