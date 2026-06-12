import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { stripe } from '@/lib/stripe'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return ctx.error
  const { id } = await params

  const service = createServiceClient()

  const { data: profile, error: fetchError } = await service
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', id)
    .single()
  if (fetchError || !profile) return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 })
  if (!profile.stripe_subscription_id) {
    return NextResponse.json({ error: 'Kein aktives Abo gefunden' }, { status: 400 })
  }

  const subscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
    cancel_at_period_end: true,
  })

  const cancelAt = subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null
  await service.from('profiles').update({ stripe_cancel_at: cancelAt }).eq('id', id)

  return NextResponse.json({ cancelAt })
}
