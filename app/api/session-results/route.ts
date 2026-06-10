import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { thema_id, mode, score_pct, correct, total } = body as {
    thema_id: number
    mode: 'drill' | 'quiz' | 'schriftlich'
    score_pct: number
    correct: number
    total: number
  }

  if (!thema_id || !mode) {
    return NextResponse.json({ error: 'thema_id and mode required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('session_results')
    .insert({ thema_id, mode, score_pct, correct, total, user_id: user.id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const themaId = searchParams.get('thema_id')

  if (!themaId) return NextResponse.json({ error: 'thema_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('session_results')
    .select('mode, score_pct, created_at')
    .eq('thema_id', Number(themaId))
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result: Record<string, { score_pct: number; created_at: string } | null> = {
    drill: null,
    quiz: null,
    schriftlich: null,
  }

  for (const row of (data ?? []) as { mode: string; score_pct: number; created_at: string }[]) {
    if (result[row.mode] === null) {
      result[row.mode] = { score_pct: row.score_pct, created_at: row.created_at }
    }
  }

  return NextResponse.json(result)
}
