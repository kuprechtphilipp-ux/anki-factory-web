import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return ctx.error
  const { user } = ctx
  const { id } = await params

  if (id === user.id) {
    return NextResponse.json({ error: 'Eigenen Account nicht sperren' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: profile, error: fetchError } = await service
    .from('profiles')
    .select('is_blocked, is_admin')
    .eq('id', id)
    .single()
  if (fetchError || !profile) return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 })
  if (profile.is_admin) {
    return NextResponse.json({ error: 'Admin-Accounts können nicht gesperrt werden' }, { status: 400 })
  }

  const nextBlocked = !profile.is_blocked

  const { error: authError } = await service.auth.admin.updateUserById(id, {
    ban_duration: nextBlocked ? '876000h' : 'none',
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const { error } = await service.from('profiles').update({ is_blocked: nextBlocked }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ is_blocked: nextBlocked })
}
