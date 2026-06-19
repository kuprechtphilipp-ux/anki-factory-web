import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, notiz_kontext } = await req.json() as { name?: string; notiz_kontext?: string | null }
  const updates: { name?: string; notiz_kontext?: string | null } = {}
  if (name !== undefined) updates.name = name
  if (notiz_kontext !== undefined) updates.notiz_kontext = notiz_kontext

  const { data, error } = await supabase
    .from('kurs').update(updates).eq('id', Number(params.id)).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('kurs').delete().eq('id', Number(params.id)).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
