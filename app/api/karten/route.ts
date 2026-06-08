import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Karte, KartStatus } from '@/lib/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const themaId = searchParams.get('thema_id')
  const status = searchParams.get('status') as KartStatus | null

  const due = searchParams.get('due')

  let query = supabase.from('karte').select('*').order('created_at')
  if (themaId) query = query.eq('thema_id', Number(themaId))
  if (status) query = query.eq('status', status)
  if (due === 'true') query = query.lte('fsrs_due', new Date().toISOString())

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Karte[])
}

export async function POST(req: Request) {
  const body = await req.json() as Partial<Karte> | Partial<Karte>[]
  const rows = Array.isArray(body) ? body : [body]
  const { data, error } = await supabase.from('karte').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Karte[], { status: 201 })
}
