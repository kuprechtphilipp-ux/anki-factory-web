import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import type { Profile } from '@/lib/types'

export async function GET() {
  const ctx = await requireAdmin()
  if ('error' in ctx) return ctx.error
  const { supabase } = ctx

  const { data, error } = await supabase
    .from('profiles_with_credits')
    .select('id, email, plan, credits_total, credits_used, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data as Pick<Profile, 'id' | 'email' | 'plan' | 'credits_total' | 'credits_used' | 'created_at'>[])
}
