import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  const pattern = `%${q}%`

  const { data, error } = await supabase
    .from('karte')
    .select(`
      id, frage, antwort, cloze_text, typ, status,
      thema:thema_id (
        id, name,
        kurs:kurs_id (id, name)
      )
    `)
    .or(`frage.ilike.${pattern},antwort.ilike.${pattern},cloze_text.ilike.${pattern}`)
    .neq('status', 'verworfen')
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
