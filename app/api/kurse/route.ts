import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Kurs } from '@/lib/types'

export async function GET() {
  const { data, error } = await supabase.from('kurs').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Kurs[])
}

export async function POST(req: Request) {
  const { name } = await req.json() as { name: string }
  const { data, error } = await supabase.from('kurs').insert({ name }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Kurs, { status: 201 })
}
