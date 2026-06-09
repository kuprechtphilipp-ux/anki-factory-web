import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const themaId = searchParams.get('thema_id')

  if (!themaId) return NextResponse.json({ error: 'thema_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('karte')
    .select('fsrs_last_review')
    .eq('thema_id', Number(themaId))
    .eq('status', 'reviewed')
    .not('fsrs_last_review', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reviewDates = new Set<string>()
  for (const row of data ?? []) {
    if (row.fsrs_last_review) {
      const d = new Date(row.fsrs_last_review)
      reviewDates.add(d.toISOString().split('T')[0])
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days: { date: string; studied: boolean }[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({ date: dateStr, studied: reviewDates.has(dateStr) })
  }

  return NextResponse.json({ days })
}
