import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fsrs, karteToFsrsCard } from '@/lib/fsrs'
import type { Karte } from '@/lib/types'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { rating } = await req.json() as { rating: 1 | 2 | 3 | 4 }

  const { data: existing, error: fetchError } = await supabase
    .from('karte')
    .select('*')
    .eq('id', Number(params.id))
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 })

  const karte = existing as Karte
  const card = karteToFsrsCard(karte)
  const now = new Date()

  // ts-fsrs repeat() returns an object keyed by Rating enum values (1=Again, 2=Hard, 3=Good, 4=Easy)
  const schedulingCards = fsrs.repeat(card, now)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (schedulingCards as any)[rating]
  const next = result.card

  const { data, error } = await supabase
    .from('karte')
    .update({
      fsrs_due: next.due.toISOString(),
      fsrs_stability: next.stability,
      fsrs_difficulty: next.difficulty,
      fsrs_elapsed_days: next.elapsed_days,
      fsrs_scheduled_days: next.scheduled_days,
      fsrs_reps: next.reps,
      fsrs_lapses: next.lapses,
      fsrs_state: next.state,
      fsrs_last_review: now.toISOString(),
    })
    .eq('id', Number(params.id))
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Karte)
}
