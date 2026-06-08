import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fsrs, karteToFsrsCard } from '@/lib/fsrs'
import type { Karte, FsrsState } from '@/lib/types'

function fmtDays(days: number): string {
  const mins = days * 1440
  if (mins < 1) return '< 1 Min'
  if (mins < 60) return `${Math.round(mins)} Min`
  const hrs = days * 24
  if (hrs < 24) return `${Math.round(hrs)} Std`
  if (days < 7) return `${Math.round(days)} Tg`
  if (days < 30) return `${Math.round(days / 7)} Wo`
  return `${Math.round(days / 30)} Mo`
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { rating, mode = 'srs' } = (await req.json()) as {
    rating: 1 | 2 | 3 | 4
    mode?: 'srs' | 'drill'
  }

  const { data: existing, error: fetchError } = await supabase
    .from('karte')
    .select('*')
    .eq('id', Number(params.id))
    .single()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 })

  const karte = existing as Karte
  const state = karte.fsrs_state as FsrsState
  const card = karteToFsrsCard(karte)
  const now = new Date()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sc = fsrs.repeat(card, now) as any
  const sd = (r: 1 | 2 | 3 | 4): number => sc[r].card.scheduled_days as number

  const nextIntervals: Record<number, string> =
    state === 0 || state === 1
      ? { 1: '< 1 Min', 2: '< 6 Min', 3: '< 10 Min', 4: fmtDays(sd(4)) }
      : { 1: '< 10 Min', 2: fmtDays(sd(2)), 3: fmtDays(sd(3)), 4: fmtDays(sd(4)) }

  function fromFsrs(r: 1 | 2 | 3 | 4, overrideState?: number, overrideDue?: Date) {
    const next = sc[r].card
    return {
      fsrs_due: (overrideDue ?? new Date(next.due)).toISOString(),
      fsrs_stability: next.stability,
      fsrs_difficulty: next.difficulty,
      fsrs_elapsed_days: next.elapsed_days,
      fsrs_scheduled_days: next.scheduled_days,
      fsrs_reps: next.reps,
      fsrs_lapses: next.lapses,
      fsrs_state: overrideState ?? next.state,
      fsrs_last_review: now.toISOString(),
    }
  }

  let updateFields: Record<string, unknown> = {}

  if (mode === 'drill') {
    if (rating === 1) {
      updateFields = {
        fsrs_due: new Date(now.getTime() + 3_600_000).toISOString(),
        fsrs_last_review: now.toISOString(),
      }
    } else {
      const next = sc[rating].card
      const currentDue = new Date(karte.fsrs_due)
      const newDue = new Date(next.due)
      updateFields = {
        ...fromFsrs(rating),
        fsrs_due: (newDue > currentDue ? newDue : currentDue).toISOString(),
      }
    }
  } else {
    // SRS mode with learning steps
    if (state === 0 || state === 1) {
      if (rating === 1) {
        updateFields = { fsrs_due: new Date(now.getTime() + 60_000).toISOString(), fsrs_state: 1, fsrs_last_review: now.toISOString() }
      } else if (rating === 2) {
        updateFields = { fsrs_due: new Date(now.getTime() + 360_000).toISOString(), fsrs_state: 1, fsrs_last_review: now.toISOString() }
      } else if (rating === 3) {
        // Graduate but show again in 10 min
        updateFields = fromFsrs(3, 2, new Date(now.getTime() + 600_000))
      } else {
        // Easy: full FSRS graduation
        updateFields = fromFsrs(4)
      }
    } else if (state === 2) {
      if (rating === 1) {
        updateFields = { fsrs_due: new Date(now.getTime() + 600_000).toISOString(), fsrs_state: 3, fsrs_last_review: now.toISOString() }
      } else {
        updateFields = fromFsrs(rating)
      }
    } else {
      // state 3 (Relearning)
      if (rating === 1) {
        updateFields = { fsrs_due: new Date(now.getTime() + 600_000).toISOString(), fsrs_state: 3, fsrs_last_review: now.toISOString() }
      } else {
        updateFields = fromFsrs(rating)
      }
    }
  }

  const { data, error } = await supabase
    .from('karte')
    .update(updateFields)
    .eq('id', Number(params.id))
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: data as Karte, nextIntervals })
}
