import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Karte } from '@/lib/types'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json() as Partial<Karte>
  const { data, error } = await supabase
    .from('karte')
    .update(body)
    .eq('id', Number(params.id))
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Karte)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await supabase.from('karte').delete().eq('id', Number(params.id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
