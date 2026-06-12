import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { createServiceClient } from '@/lib/supabase/service'
import { stripe } from '@/lib/stripe'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAdmin()
  if ('error' in ctx) return ctx.error
  const { user } = ctx
  const { id } = await params

  if (id === user.id) {
    return NextResponse.json({ error: 'Eigenen Account hier nicht löschen' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: profile } = await service
    .from('profiles')
    .select('stripe_subscription_id, is_admin')
    .eq('id', id)
    .single()

  if (profile?.is_admin) {
    return NextResponse.json({ error: 'Admin-Accounts können nicht gelöscht werden' }, { status: 400 })
  }

  if (profile?.stripe_subscription_id) {
    // Subscription kann bereits geloescht/abgelaufen sein - darf die Loeschung nicht blockieren
    await stripe.subscriptions.cancel(profile.stripe_subscription_id).catch(() => {})
  }

  const { error } = await service.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
