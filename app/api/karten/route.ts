import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Karte, KartStatus } from '@/lib/types'

async function resolveThemaIds(supabase: SupabaseClient, themaId: string | null, kursName: string | null): Promise<number[] | null> {
  if (themaId) return [Number(themaId)]
  if (kursName) {
    const { data: kursRow } = await supabase.from('kurs').select('id').eq('name', kursName).single()
    if (!kursRow) return null
    const { data: themen } = await supabase.from('thema').select('id').eq('kurs_id', kursRow.id)
    return (themen ?? []).map((t: { id: number }) => t.id)
  }
  return null
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const themaId = searchParams.get('thema_id')
  const kursName = searchParams.get('kurs_name')
  const status = searchParams.get('status') as KartStatus | null
  const due = searchParams.get('due')
  const mode = searchParams.get('mode')

  if (mode === 'srs') {
    const now = new Date().toISOString()
    const themaIds = await resolveThemaIds(supabase, themaId, kursName)
    const base = () => {
      let q = supabase.from('karte').select('*').eq('status', 'reviewed')
      if (themaIds && themaIds.length === 1) q = q.eq('thema_id', themaIds[0])
      else if (themaIds && themaIds.length > 1) q = q.in('thema_id', themaIds)
      return q
    }
    const [lr, rr, nr] = await Promise.all([
      base().in('fsrs_state', [1, 3]).lte('fsrs_due', now).order('fsrs_due'),
      base().eq('fsrs_state', 2).lte('fsrs_due', now).order('fsrs_due').limit(200),
      base().eq('fsrs_state', 0).order('created_at').limit(20),
    ])
    const learning = (lr.data ?? []) as Karte[]
    const reviews = (rr.data ?? []) as Karte[]
    const neue = (nr.data ?? []) as Karte[]
    return NextResponse.json({ learning, reviews, neue, total: learning.length + reviews.length + neue.length })
  }

  if (mode === 'drill') {
    const themaIds = await resolveThemaIds(supabase, themaId, kursName)
    let query = supabase.from('karte').select('*').eq('status', 'reviewed')
    if (themaIds && themaIds.length === 1) query = query.eq('thema_id', themaIds[0])
    else if (themaIds && themaIds.length > 1) query = query.in('thema_id', themaIds)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data as Karte[])
  }

  // Default behaviour
  let query = supabase.from('karte').select('*').order('created_at')
  if (themaId) query = query.eq('thema_id', Number(themaId))
  if (status) query = query.eq('status', status)
  if (due === 'true') query = query.lte('fsrs_due', new Date().toISOString())

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Karte[])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json()) as Partial<Karte> | Partial<Karte>[]
  const rows = Array.isArray(body) ? body : [body]
  const { data, error } = await supabase.from('karte').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Karte[], { status: 201 })
}
