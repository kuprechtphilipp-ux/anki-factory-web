import type { SupabaseClient } from '@supabase/supabase-js'

export interface CramoLernfortschritt {
  streak: number
  faelligeKarten: number
  problemKarten: number
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Leichtgewichtiger Lernfortschritt-Snapshot für den Cramo-Chat-Kontext
 * (Streak, fällige Karten, Problemkarten mit wiederholten Fehlern).
 */
export async function getCramoLernfortschritt(
  supabase: SupabaseClient,
  userId: string
): Promise<CramoLernfortschritt> {
  const now = new Date()
  const today = toDateStr(now)
  const yesterday = toDateStr(new Date(now.getTime() - 86_400_000))

  const since = new Date(now)
  since.setDate(since.getDate() - 60)
  since.setHours(0, 0, 0, 0)

  const [faelligeRes, problemRes, streakRes] = await Promise.all([
    supabase.from('karte').select('id', { count: 'exact', head: true })
      .eq('status', 'reviewed').lte('fsrs_due', now.toISOString()),
    supabase.from('karte').select('id', { count: 'exact', head: true })
      .gte('fsrs_lapses', 2),
    supabase.from('lern_streak').select('datum, karten_gelernt')
      .eq('user_id', userId).gte('datum', toDateStr(since)),
  ])

  const streakMap: Record<string, number> = {}
  for (const r of streakRes.data ?? []) streakMap[r.datum] = r.karten_gelernt

  const learnedToday = (streakMap[today] ?? 0) > 0
  const startDay = learnedToday ? today : ((streakMap[yesterday] ?? 0) > 0 ? yesterday : null)

  let streak = 0
  if (startDay) {
    let cursor = new Date(startDay + 'T12:00:00Z')
    while (true) {
      const ds = toDateStr(cursor)
      if (!streakMap[ds]) break
      streak++
      cursor = new Date(cursor.getTime() - 86_400_000)
    }
  }

  return {
    streak,
    faelligeKarten: faelligeRes.count ?? 0,
    problemKarten: problemRes.count ?? 0,
  }
}
