import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Karte, Thema } from '@/lib/types'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const kursName = searchParams.get('kurs_name')

  if (!kursName) return NextResponse.json({ error: 'kurs_name required' }, { status: 400 })

  const { data: kursRow } = await supabase.from('kurs').select('id').eq('name', kursName).single()
  if (!kursRow) return NextResponse.json({ error: 'Kurs nicht gefunden' }, { status: 404 })

  const { data: themenData } = await supabase.from('thema').select('*').eq('kurs_id', kursRow.id).order('name')
  const themen = (themenData ?? []) as Thema[]

  if (themen.length === 0) {
    return NextResponse.json({
      due_heute: 0,
      due_7_tage: [0, 0, 0, 0, 0, 0, 0],
      total_karten: 0,
      avg_retention: 0,
      themen: [],
    })
  }

  const themaIds = themen.map((t) => t.id)
  const now = new Date()

  const [reviewedRes, neuRes] = await Promise.all([
    supabase.from('karte').select('*').in('thema_id', themaIds).eq('status', 'reviewed'),
    supabase.from('karte').select('thema_id, id').in('thema_id', themaIds).eq('status', 'neu'),
  ])

  const karten = (reviewedRes.data ?? []) as Karte[]
  const neuByThema: Record<number, number> = {}
  for (const k of neuRes.data ?? []) {
    const id = (k as { thema_id: number; id: number }).thema_id
    neuByThema[id] = (neuByThema[id] ?? 0) + 1
  }

  const dueHeute = karten.filter((k) => new Date(k.fsrs_due) <= now).length

  const due7Tage: number[] = Array(7).fill(0)
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(now)
    dayStart.setDate(dayStart.getDate() + i)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)
    due7Tage[i] = karten.filter((k) => {
      const d = new Date(k.fsrs_due)
      return d >= dayStart && d <= dayEnd
    }).length
  }

  let totalRetention = 0
  let retentionCount = 0
  for (const k of karten) {
    if (k.fsrs_stability > 0 && k.fsrs_last_review) {
      const daysSince = (now.getTime() - new Date(k.fsrs_last_review).getTime()) / 86_400_000
      totalRetention += Math.exp(-daysSince / k.fsrs_stability)
      retentionCount++
    }
  }
  const avgRetention = retentionCount > 0 ? totalRetention / retentionCount : 0

  const { data: sessionData } = await supabase
    .from('session_results')
    .select('thema_id, mode, score_pct, created_at')
    .in('thema_id', themaIds)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const lastSession: Record<number, Record<string, number>> = {}
  for (const row of (sessionData ?? []) as { thema_id: number; mode: string; score_pct: number }[]) {
    if (!lastSession[row.thema_id]) lastSession[row.thema_id] = {}
    if (lastSession[row.thema_id][row.mode] == null) {
      lastSession[row.thema_id][row.mode] = row.score_pct
    }
  }

  const themenStats = themen.map((t) => {
    const tk = karten.filter((k) => k.thema_id === t.id)
    const dueToday = tk.filter((k) => new Date(k.fsrs_due) <= now).length
    let tRetTotal = 0
    let tRetCount = 0
    for (const k of tk) {
      if (k.fsrs_stability > 0 && k.fsrs_last_review) {
        const daysSince = (now.getTime() - new Date(k.fsrs_last_review).getTime()) / 86_400_000
        tRetTotal += Math.exp(-daysSince / k.fsrs_stability)
        tRetCount++
      }
    }
    const mature = tk.filter(k => k.fsrs_state === 2 && k.fsrs_stability > 4).length
    const gelernt = tk.filter(k => k.fsrs_reps > 0).length
    const ls = lastSession[t.id] ?? {}
    return {
      name: t.name,
      id: t.id,
      due: dueToday,
      total: tk.length,
      neu: neuByThema[t.id] ?? 0,
      retention: tRetCount > 0 ? tRetTotal / tRetCount : 0,
      mature,
      gelernt,
      last_drill: ls['drill'] ?? null,
      last_quiz: ls['quiz'] ?? null,
      last_schriftlich: ls['schriftlich'] ?? null,
    }
  })

  return NextResponse.json({
    due_heute: dueHeute,
    due_7_tage: due7Tage,
    total_karten: karten.length,
    avg_retention: avgRetention,
    themen: themenStats,
  })
}
