import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const themaId = Number(params.id)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let ids: number[] | null = null
  try {
    const body = await req.json()
    if (Array.isArray(body?.ids)) ids = body.ids
  } catch {
    // kein JSON-Body → ignorieren
  }

  let query = supabase.from('karte').delete().eq('thema_id', themaId)
  if (ids) query = query.in('id', ids)
  if (status) query = query.eq('status', status)

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
