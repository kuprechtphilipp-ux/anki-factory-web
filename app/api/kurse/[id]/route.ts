import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { name } = await req.json() as { name: string }
  const { data, error } = await supabase
    .from('kurs').update({ name }).eq('id', Number(params.id)).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await supabase.from('kurs').delete().eq('id', Number(params.id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
