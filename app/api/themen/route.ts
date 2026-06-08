import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Thema } from '@/lib/types'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const kursId = searchParams.get('kurs_id')

  let query = supabase.from('thema').select('*').order('name')
  if (kursId) query = query.eq('kurs_id', Number(kursId))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Thema[])
}

export async function POST(req: Request) {
  const { kurs_id, name } = await req.json() as { kurs_id: number; name: string }
  const { data, error } = await supabase.from('thema').insert({ kurs_id, name }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Thema, { status: 201 })
}
