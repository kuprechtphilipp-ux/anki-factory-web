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

  // ── Globaler Kurs/Thema-Breakdown + Forecast + Verteilungen ──
  const [{ data: kurseData }, { data: themenData }, { data: kartenData }, { data: sessionData }] = await Promise.all([
    supabase.from('kurs').select('id, name'),
    supabase.from('thema').select('id, kurs_id, name'),
    supabase.from('karte').select('id, thema_id, status, typ, fsrs_state, fsrs_due, fsrs_stability, fsrs_last_review'),
    supabase.from('session_results').select('thema_id, mode, score_pct, created_at').order('created_at', { ascending: false }),
  ])

  const kurse = (kurseData ?? []) as { id: number; name: string }[]
  const themen = (themenData ?? []) as { id: number; kurs_id: number; name: string }[]
  const karten = (kartenData ?? []) as {
    id: number
    thema_id: number
    status: string
    typ: string
    fsrs_state: number
    fsrs_due: string
    fsrs_stability: number
    fsrs_last_review: string | null
  }[]
  const sessions = (sessionData ?? []) as { thema_id: number; mode: string; score_pct: number; created_at: string }[]

  const kursNameById = new Map(kurse.map((k) => [k.id, k.name]))

  // Letzter Score pro Thema+Mode (sessions ist bereits nach created_at desc sortiert)
  const lastSessionByThema: Record<number, Record<string, number>> = {}
  for (const row of sessions) {
    if (!lastSessionByThema[row.thema_id]) lastSessionByThema[row.thema_id] = {}
    if (lastSessionByThema[row.thema_id][row.mode] == null) {
      lastSessionByThema[row.thema_id][row.mode] = row.score_pct
    }
  }

  const reviewedKarten = karten.filter((k) => k.status === 'reviewed')

  const themenBreakdown = themen.map((t) => {
    const tk = reviewedKarten.filter((k) => k.thema_id === t.id)
    const due = tk.filter((k) => new Date(k.fsrs_due) <= now).length
    const neu = karten.filter((k) => k.thema_id === t.id && k.status === 'neu').length
    let retTotal = 0
    let retCount = 0
    for (const k of tk) {
      if (k.fsrs_stability > 0 && k.fsrs_last_review) {
        const daysSince = (now.getTime() - new Date(k.fsrs_last_review).getTime()) / 86_400_000
        retTotal += Math.exp(-daysSince / k.fsrs_stability)
        retCount++
      }
    }
    const ls = lastSessionByThema[t.id] ?? {}
    return {
      kurs_name: kursNameById.get(t.kurs_id) ?? '',
      thema_name: t.name,
      thema_id: t.id,
      due,
      neu,
      total: tk.length,
      retention: retCount > 0 ? retTotal / retCount : 0,
      last_drill: ls['drill'] ?? null,
      last_quiz: ls['quiz'] ?? null,
      last_schriftlich: ls['schriftlich'] ?? null,
    }
  })

  // Forecast: fällige Karten für die nächsten 30 Tage (Index 0 = heute)
  const forecast30: number[] = Array(30).fill(0)
  for (let i = 0; i < 30; i++) {
    const dayStart = new Date(now)
    dayStart.setDate(dayStart.getDate() + i)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)
    forecast30[i] = reviewedKarten.filter((k) => {
      const d = new Date(k.fsrs_due)
      return d >= dayStart && d <= dayEnd
    }).length
  }

  // Performance-Trends: letzte 20 Sessions pro Mode, chronologisch aufsteigend
  const performanceTrends = {
    drill: sessions.filter((s) => s.mode === 'drill').slice(0, 20).reverse()
      .map((s) => ({ score_pct: s.score_pct, created_at: s.created_at })),
    quiz: sessions.filter((s) => s.mode === 'quiz').slice(0, 20).reverse()
      .map((s) => ({ score_pct: s.score_pct, created_at: s.created_at })),
    schriftlich: sessions.filter((s) => s.mode === 'schriftlich').slice(0, 20).reverse()
      .map((s) => ({ score_pct: s.score_pct, created_at: s.created_at })),
  }

  // FSRS-State-Verteilung (nur reviewed Karten)
  const fsrsVerteilung = {
    new: reviewedKarten.filter((k) => k.fsrs_state === 0).length,
    learning: reviewedKarten.filter((k) => k.fsrs_state === 1).length,
    review: reviewedKarten.filter((k) => k.fsrs_state === 2).length,
    relearning: reviewedKarten.filter((k) => k.fsrs_state === 3).length,
  }

  // Kartentyp-Verteilung (alle Karten)
  const typVerteilung = {
    basic: karten.filter((k) => k.typ === 'basic').length,
    cloze: karten.filter((k) => k.typ === 'cloze').length,
  }

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
    themenBreakdown,
    forecast30,
    performanceTrends,
    fsrsVerteilung,
    typVerteilung,
  })
}
