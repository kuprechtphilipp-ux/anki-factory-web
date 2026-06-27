import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import type { GeneralFeedback } from '@/lib/types'

export async function GET() {
  const ctx = await requireAdmin()
  if ('error' in ctx) return ctx.error
  const { supabase } = ctx

  const { data: feedback, error } = await supabase
    .from('general_feedback')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = Array.from(new Set((feedback ?? []).map((f) => f.user_id)))
  let emailById: Record<string, string | null> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds)
    emailById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.email]))
  }

  const result = (feedback as GeneralFeedback[]).map((f) => ({
    ...f,
    user_email: emailById[f.user_id] ?? null,
  }))

  return NextResponse.json(result)
}
