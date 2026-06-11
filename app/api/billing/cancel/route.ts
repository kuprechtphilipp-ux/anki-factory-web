import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({ error: 'Kein aktives Abo gefunden' }, { status: 400 })
  }

  const subscription = await stripe.subscriptions.update(profile.stripe_subscription_id, {
    cancel_at_period_end: true,
  })

  const periodEnd = subscription.items.data[0]?.current_period_end
  return NextResponse.json({
    cancelAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  })
}
