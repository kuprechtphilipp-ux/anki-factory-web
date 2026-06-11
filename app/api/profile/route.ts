import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Lernfenster } from '@/lib/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles_with_credits')
    .select('fachbereich, lernziel, lernfenster, onboarding_completed, plan, credits_total, credits_used, credits_reset_at, email')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: redeemedCode } = await supabase.rpc('get_my_redeemed_code')

  return NextResponse.json({ ...data, redeemed_code: redeemedCode ?? null })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    fachbereich?: string | null
    lernziel?: string | null
    lernfenster?: Lernfenster | null
    onboarding_completed?: boolean
  }

  const update: Record<string, unknown> = {}
  if ('fachbereich' in body) update.fachbereich = body.fachbereich
  if ('lernziel' in body) update.lernziel = body.lernziel
  if ('lernfenster' in body) update.lernfenster = body.lernfenster
  if ('onboarding_completed' in body) update.onboarding_completed = body.onboarding_completed

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)
    .select('fachbereich, lernziel, lernfenster, onboarding_completed')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
