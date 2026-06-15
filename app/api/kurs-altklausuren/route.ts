import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import pdf from 'pdf-parse'

export const maxDuration = 60

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const kursId = searchParams.get('kurs_id')
  if (!kursId) return NextResponse.json({ error: 'kurs_id fehlt' }, { status: 400 })

  const { data, error } = await supabase
    .from('kurs_altklausur')
    .select('id, kurs_id, dateiname, created_at')
    .eq('kurs_id', Number(kursId))
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('pdf') as File | null
  const kursId = formData.get('kurs_id') as string | null
  if (!file) return NextResponse.json({ error: 'Kein PDF hochgeladen (field: pdf)' }, { status: 400 })
  if (!kursId) return NextResponse.json({ error: 'kurs_id fehlt' }, { status: 400 })

  const { data: kursRow } = await supabase
    .from('kurs')
    .select('id')
    .eq('id', Number(kursId))
    .eq('user_id', user.id)
    .single()
  if (!kursRow) return NextResponse.json({ error: 'Kurs nicht gefunden' }, { status: 404 })

  const buffer = Buffer.from(await file.arrayBuffer())
  let inhaltText = ''
  try {
    const parsed = await pdf(buffer)
    inhaltText = parsed.text.trim()
  } catch (err) {
    console.error('[kurs-altklausuren] PDF konnte nicht gelesen werden:', err)
    return NextResponse.json({ error: 'PDF konnte nicht gelesen werden' }, { status: 422 })
  }

  if (!inhaltText) {
    return NextResponse.json({ error: 'PDF enthält keinen erkennbaren Text' }, { status: 422 })
  }

  const { data, error } = await supabase
    .from('kurs_altklausur')
    .insert({ kurs_id: Number(kursId), dateiname: file.name, inhalt_text: inhaltText })
    .select('id, kurs_id, dateiname, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
