import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import type { Profile } from '@/lib/types'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return ctx.error
  const { supabase } = ctx
  const { id } = await params

  const { creditsToAdd } = await req.json() as { creditsToAdd: number }
  if (!Number.isInteger(creditsToAdd) || creditsToAdd <= 0) {
    return NextResponse.json({ error: 'creditsToAdd muss eine positive Ganzzahl sein' }, { status: 400 })
  }

  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits_total')
    .eq('id', id)
    .single()
  if (fetchError || !profile) return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 })

  const { data, error } = await supabase
    .from('profiles')
    .update({ credits_total: profile.credits_total + creditsToAdd })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Profile)
}
