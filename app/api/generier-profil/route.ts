import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('generier_profil').select('*').eq('user_id', user.id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? {
    bevorzugter_detailgrad: 'Mittel',
    bevorzugte_kartenmenge: 20,
    bevorzugter_kartentyp: 'gemischt',
    feedback_count: 0,
    notizen: [],
    last_updated: new Date().toISOString(),
  })
}
