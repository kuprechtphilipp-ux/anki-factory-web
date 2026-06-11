import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { stripe } from '@/lib/stripe'
import { getPlanConfig } from '@/lib/plans'
import type { Plan } from '@/lib/types'

const PURCHASABLE_PLANS: Plan[] = ['basic_plus', 'premium', 'ultra']

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { plan: Plan; returnTo?: string }
  if (!PURCHASABLE_PLANS.includes(body.plan)) {
    return NextResponse.json({ error: 'Ungültiger Plan' }, { status: 400 })
  }

  const returnTo = body.returnTo?.startsWith('/') ? body.returnTo : '/account'

  const planConfig = await getPlanConfig(supabase)
  const priceId = planConfig[body.plan].stripe_price_id
  if (!priceId) {
    return NextResponse.json({ error: 'Für diesen Plan ist noch kein Stripe-Preis hinterlegt' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, stripe_subscription_id, email')
    .eq('id', user.id)
    .single()

  // Bestehendes Abo: Plan direkt per Price-Swap wechseln (Proration), statt
  // eine neue Checkout-Session zu starten -- sonst entsteht eine zweite,
  // parallele Subscription fuer denselben Kunden.
  if (profile?.stripe_customer_id && profile?.stripe_subscription_id) {
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
    const itemId = subscription.items.data[0]?.id
    if (!itemId) {
      return NextResponse.json({ error: 'Abo konnte nicht geladen werden' }, { status: 500 })
    }

    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: 'create_prorations',
      cancel_at_period_end: false,
    })

    const service = createServiceClient()
    await service.rpc('apply_stripe_subscription', {
      p_user_id: user.id,
      p_plan: body.plan,
      p_credits: planConfig[body.plan].credits,
      p_customer_id: profile.stripe_customer_id,
      p_subscription_id: profile.stripe_subscription_id,
    })
    // cancel_at_period_end wurde oben aufgehoben -- Kuendigungs-Hinweis sofort
    // entfernen, statt auf den Webhook zu warten.
    await service.from('profiles').update({ stripe_cancel_at: null }).eq('id', user.id)

    return NextResponse.json({ switched: true, plan: body.plan })
  }

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
    success_url: `${origin}${returnTo}?checkout=success&plan=${body.plan}`,
    cancel_url: `${origin}${returnTo}?checkout=cancel`,
  })

  if (!session.url) {
    return NextResponse.json({ error: 'Checkout-Session konnte nicht erstellt werden' }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
