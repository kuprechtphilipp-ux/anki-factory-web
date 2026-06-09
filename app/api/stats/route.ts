import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const now = new Date()

  // Last 365 days of reviews grouped by date
  const since = new Date(now)
  since.setDate(since.getDate() - 364)
  since.setHours(0, 0, 0, 0)

  const { data: logs } = await supabase
    .from('review_log')
    .select('reviewed_at, rating')
    .gte('reviewed_at', since.toISOString())
    .order('reviewed_at', { ascending: true })

  // Build heatmap: date → count
  const heatmap: Record<string, number> = {}
  let totalReviews = 0
  let positiveReviews = 0

  for (const row of logs ?? []) {
    const d = row.reviewed_at.slice(0, 10) // "YYYY-MM-DD"
    heatmap[d] = (heatmap[d] ?? 0) + 1
    totalReviews++
    if (row.rating >= 3) positiveReviews++
  }

  // Streak: consecutive days ending today (or yesterday) with at least one review
  const today = toDateStr(now)
  const yesterday = toDateStr(new Date(now.getTime() - 86_400_000))
  let streak = 0
  let bestStreak = 0
  let current = 0

  // Walk backwards from today
  const streakStart = heatmap[today] ? today : heatmap[yesterday] ? yesterday : null
  if (streakStart) {
    let cursor = new Date(streakStart)
    while (true) {
      const ds = toDateStr(cursor)
      if (!heatmap[ds]) break
      streak++
      cursor = new Date(cursor.getTime() - 86_400_000)
    }
  }

  // Best streak: walk all days in ascending order
  const allDays = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    return toDateStr(d)
  })
  for (const d of allDays) {
    if (heatmap[d]) {
      current++
      if (current > bestStreak) bestStreak = current
    } else {
      current = 0
    }
  }

  // Today's count
  const todayReviews = heatmap[today] ?? 0

  // Total cards in DB with at least one review
  const { count: totalCards } = await supabase
    .from('karte')
    .select('id', { count: 'exact', head: true })
    .neq('fsrs_reps', 0)

  const retentionRate = totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 100) : 0

  // Convert heatmap to sorted array
  const heatmapArray = allDays.map((date) => ({ date, count: heatmap[date] ?? 0 }))

  return NextResponse.json({
    streak,
    bestStreak,
    totalReviews,
    todayReviews,
    retentionRate,
    heatmap: heatmapArray,
    totalCards: totalCards ?? 0,
  })
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}
