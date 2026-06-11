import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { getPlanConfig } from '@/lib/plans'
import type { Plan } from '@/lib/types'

const PURCHASABLE_PLANS: Plan[] = ['basic_plus', 'premium', 'ultra']

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { plan: Plan }
  if (!PURCHASABLE_PLANS.includes(body.plan)) {
    return NextResponse.json({ error: 'Ungültiger Plan' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', user.id)
    .single()

  // Ohne bestehendes Abo gibt es keine Proration zu previewen -- der User
  // landet ohnehin auf der Stripe-Checkout-Seite mit dem regulaeren Preis.
  if (!profile?.stripe_customer_id || !profile?.stripe_subscription_id) {
    return NextResponse.json({ hasSubscription: false })
  }

  const planConfig = await getPlanConfig(supabase)
  const priceId = planConfig[body.plan].stripe_price_id
  if (!priceId) {
    return NextResponse.json({ error: 'Für diesen Plan ist noch kein Stripe-Preis hinterlegt' }, { status: 400 })
  }

  const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
  const itemId = subscription.items.data[0]?.id
  if (!itemId) {
    return NextResponse.json({ error: 'Abo konnte nicht geladen werden' }, { status: 500 })
  }

  const preview = await stripe.invoices.createPreview({
    customer: profile.stripe_customer_id,
    subscription: profile.stripe_subscription_id,
    subscription_details: {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: 'create_prorations',
    },
  })

  const prorationAmount = preview.lines.data
    .filter((line) => line.parent?.subscription_item_details?.proration)
    .reduce((sum, line) => sum + line.amount, 0)

  return NextResponse.json({
    hasSubscription: true,
    prorationAmount,
    currency: preview.currency,
  })
}
