import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlanConfig } from '@/lib/plans'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = await getPlanConfig(supabase)
  return NextResponse.json(config)
}
