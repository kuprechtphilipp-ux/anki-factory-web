import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .single()

  if (profile?.stripe_subscription_id) {
    // Subscription kann bereits geloescht/abgelaufen sein - darf die Account-Loeschung nicht blockieren
    await stripe.subscriptions.cancel(profile.stripe_subscription_id).catch(() => {})
  }

  const { error } = await supabase.rpc('delete_my_account')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
