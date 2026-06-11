import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { getPlanConfig, type PlanConfig } from '@/lib/plans'
import type { Plan } from '@/lib/types'

export const runtime = 'nodejs'

function planForPriceId(planConfig: PlanConfig, priceId: string | undefined): Plan | null {
  if (!priceId) return null
  for (const entry of Object.values(planConfig)) {
    if (entry.stripe_price_id === priceId) return entry.plan
  }
  return null
}

async function userIdForCustomer(
  supabase: ReturnType<typeof createServiceClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()
  return data?.id ?? null
}

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const planConfig = await getPlanConfig(supabase)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id ?? session.client_reference_id
      const plan = session.metadata?.plan as Plan | undefined
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

      if (userId && plan && customerId && subscriptionId) {
        await supabase.rpc('apply_stripe_subscription', {
          p_user_id: userId,
          p_plan: plan,
          p_credits: planConfig[plan].credits,
          p_customer_id: customerId,
          p_subscription_id: subscriptionId,
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
      const priceId = subscription.items.data[0]?.price.id
      const plan = planForPriceId(planConfig, priceId)
      const userId = subscription.metadata?.user_id ?? (await userIdForCustomer(supabase, customerId))

      if (userId && plan) {
        await supabase.rpc('apply_stripe_subscription', {
          p_user_id: userId,
          p_plan: plan,
          p_credits: planConfig[plan].credits,
          p_customer_id: customerId,
          p_subscription_id: subscription.id,
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
      const userId = subscription.metadata?.user_id ?? (await userIdForCustomer(supabase, customerId))

      if (userId) {
        await supabase.rpc('cancel_stripe_subscription', { p_user_id: userId })
      }
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.billing_reason !== 'subscription_cycle') break
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
      if (!customerId) break

      const userId = await userIdForCustomer(supabase, customerId)
      if (userId) {
        await supabase.rpc('renew_stripe_credits', { p_user_id: userId })
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
