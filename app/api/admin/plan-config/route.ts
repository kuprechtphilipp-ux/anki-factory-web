import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getPlanConfig } from '@/lib/plans'
import type { Plan } from '@/lib/types'

const VALID_PLANS: Plan[] = ['basic', 'basic_plus', 'premium', 'ultra']

export async function GET() {
  const ctx = await requireAdmin()
  if ('error' in ctx) return ctx.error
  const { supabase } = ctx

  const config = await getPlanConfig(supabase)
  return NextResponse.json(config)
}

export async function PATCH(req: Request) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return ctx.error
  const { supabase } = ctx

  const body = await req.json() as {
    plan: Plan
    credits: number
    price_chf: number | null
    description: string
  }

  if (!VALID_PLANS.includes(body.plan)) {
    return NextResponse.json({ error: 'Ungültiger Plan' }, { status: 400 })
  }
  if (!Number.isInteger(body.credits) || body.credits < 0) {
    return NextResponse.json({ error: 'Credits müssen eine positive Ganzzahl sein' }, { status: 400 })
  }
  if (body.price_chf !== null && (typeof body.price_chf !== 'number' || body.price_chf < 0)) {
    return NextResponse.json({ error: 'Preis muss eine positive Zahl oder null sein' }, { status: 400 })
  }
  if (typeof body.description !== 'string' || !body.description.trim()) {
    return NextResponse.json({ error: 'Beschreibung darf nicht leer sein' }, { status: 400 })
  }

  const { error } = await supabase
    .from('plan_config')
    .update({
      credits: body.credits,
      price_chf: body.price_chf,
      description: body.description.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('plan', body.plan)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const config = await getPlanConfig(supabase)
  return NextResponse.json(config)
}
