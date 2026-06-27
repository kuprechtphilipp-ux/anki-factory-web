import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { FeedbackCategory } from '@/lib/types'

const CATEGORIES: FeedbackCategory[] = ['bug', 'idee', 'sonstiges']

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { category?: FeedbackCategory; message?: string }
  const message = body.message?.trim()
  if (!message) return NextResponse.json({ error: 'Nachricht darf nicht leer sein' }, { status: 400 })
  const category = CATEGORIES.includes(body.category as FeedbackCategory) ? body.category! : 'sonstiges'

  const { error } = await supabase.from('general_feedback').insert({
    user_id: user.id,
    category,
    message,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
