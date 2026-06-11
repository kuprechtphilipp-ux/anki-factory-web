import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { getPlanConfig } from '@/lib/plans'
import type { InviteCode, Plan } from '@/lib/types'

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // ohne 0/O/1/I
const CODE_LENGTH = 8

function generateCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}

export async function GET() {
  const ctx = await requireAdmin()
  if ('error' in ctx) return ctx.error
  const { supabase } = ctx

  const { data: codes, error } = await supabase
    .from('invite_codes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const usedByIds = Array.from(new Set((codes ?? []).map((c) => c.used_by).filter((id): id is string => !!id)))
  let emailById: Record<string, string | null> = {}
  if (usedByIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', usedByIds)
    emailById = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.email]))
  }

  const result = (codes as InviteCode[]).map((c) => ({
    ...c,
    used_by_email: c.used_by ? emailById[c.used_by] ?? null : null,
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return ctx.error
  const { supabase, user } = ctx

  const body = await req.json() as { plan: Exclude<Plan, 'basic'>; credits?: number }
  const { plan } = body
  if (!['basic_plus', 'premium', 'ultra'].includes(plan)) {
    return NextResponse.json({ error: 'Ungültiger Plan' }, { status: 400 })
  }
  const planConfig = await getPlanConfig(supabase)
  const credits = body.credits ?? planConfig[plan].credits

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    const { data, error } = await supabase
      .from('invite_codes')
      .insert({ code, plan, credits, created_by: user.id })
      .select()
      .single()

    if (!error) return NextResponse.json(data as InviteCode, { status: 201 })
    if (error.code !== '23505') return NextResponse.json({ error: error.message }, { status: 500 })
    // 23505 = unique violation -> retry with a new code
  }

  return NextResponse.json({ error: 'Code-Generierung fehlgeschlagen, bitte erneut versuchen' }, { status: 500 })
}
