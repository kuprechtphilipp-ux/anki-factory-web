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

  const planConfig = await getPlanConfig(supabase)
  const priceId = planConfig[body.plan].stripe_price_id
  if (!priceId) {
    return NextResponse.json({ error: 'Für diesen Plan ist noch kein Stripe-Preis hinterlegt' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email')
    .eq('id', user.id)
    .single()

  const origin = req.headers.get('origin') ?? new URL(req.url).origin

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    customer: profile?.stripe_customer_id ?? undefined,
    customer_email: profile?.stripe_customer_id ? undefined : (profile?.email ?? user.email ?? undefined),
    allow_promotion_codes: true,
    metadata: { user_id: user.id, plan: body.plan },
    subscription_data: { metadata: { user_id: user.id, plan: body.plan } },
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/account?checkout=cancel`,
  })

  if (!session.url) {
    return NextResponse.json({ error: 'Checkout-Session konnte nicht erstellt werden' }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
