'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { PlanBadge } from '@/components/plan-badge'
import { formatPlanPrice, PLAN_ORDER, PLAN_LABELS, PLAN_UPDATED_EVENT } from '@/lib/plans'
import type { Plan } from '@/lib/types'

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: Plan
  targetPlan: Plan
  priceChf: number | null
  onChanged?: () => void
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type PreviewState =
  | { status: 'loading' }
  | { status: 'none' } // kein bestehendes Abo -> Stripe Checkout, keine Proration
  | { status: 'ready'; amount: number; currency: string }
  | { status: 'error' }

export function UpgradeDialog({ open, onOpenChange, currentPlan, targetPlan, priceChf, onChanged }: UpgradeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [cancelAt, setCancelAt] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState>({ status: 'loading' })

  const mode: 'upgrade' | 'downgrade' | 'cancel' =
    targetPlan === 'basic'
      ? 'cancel'
      : PLAN_ORDER.indexOf(targetPlan) > PLAN_ORDER.indexOf(currentPlan)
        ? 'upgrade'
        : 'downgrade'

  useEffect(() => {
    if (!open || mode === 'cancel') return
    setPreview({ status: 'loading' })
    fetch('/api/billing/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: targetPlan }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { hasSubscription?: boolean; prorationAmount?: number; currency?: string } | null) => {
        if (!data) { setPreview({ status: 'error' }); return }
        if (!data.hasSubscription) { setPreview({ status: 'none' }); return }
        setPreview({ status: 'ready', amount: data.prorationAmount ?? 0, currency: data.currency ?? 'chf' })
      })
      .catch(() => setPreview({ status: 'error' }))
  }, [open, mode, targetPlan])

  function formatProration(amount: number, currency: string): string {
    const value = Math.abs(amount) / 100
    const formatted = new Intl.NumberFormat('de-CH', { style: 'currency', currency: currency.toUpperCase() }).format(value)
    return formatted
  }

  async function handleCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan, returnTo: window.location.pathname }),
      })
      const data = await res.json() as { url?: string; switched?: boolean; plan?: Plan; error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Aktion konnte nicht ausgeführt werden')
        return
      }
      if (data.switched && data.plan) {
        toast.success(`Plan erfolgreich auf ${PLAN_LABELS[data.plan] ?? data.plan} geändert!`, {
          description: 'Du kannst dein Abo jederzeit unter Account & Profil verwalten.',
        })
        onChanged?.()
        window.dispatchEvent(new Event(PLAN_UPDATED_EVENT))
        onOpenChange(false)
        return
      }
      if (data.url) {
        window.location.href = data.url
        return
      }
      toast.error('Aktion konnte nicht ausgeführt werden')
    } catch {
      toast.error('Aktion konnte nicht ausgeführt werden')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      const data = await res.json() as { cancelAt?: string | null; error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Abo konnte nicht gekündigt werden')
        return
      }
      if (data.cancelAt) {
        setCancelAt(data.cancelAt)
      }
      toast.success('Abo gekündigt', {
        description: data.cancelAt
          ? `Du kannst deinen Plan noch bis ${fmtDate(data.cancelAt)} nutzen.`
          : 'Dein Plan wird zum Ende der aktuellen Periode auf Basic zurückgestuft.',
      })
      onChanged?.()
      window.dispatchEvent(new Event(PLAN_UPDATED_EVENT))
    } catch {
      toast.error('Abo konnte nicht gekündigt werden')
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'cancel') {
    return (
      <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setCancelAt(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Abo kündigen</DialogTitle>
            <DialogDescription className="flex items-center gap-1.5 pt-1">
              <PlanBadge plan={currentPlan} />
              <span>aktuelles Abo</span>
            </DialogDescription>
          </DialogHeader>

          {cancelAt ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dein {PLAN_LABELS[currentPlan]}-Abo wurde gekündigt. Du kannst deine Credits und Funktionen
              noch bis <span className="font-medium text-foreground">{fmtDate(cancelAt)}</span> nutzen.
              Danach wechselst du automatisch zu Basic. Du kannst das Abo jederzeit vorher unter
              &quot;Abo verwalten&quot; reaktivieren.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dein {PLAN_LABELS[currentPlan]}-Abo wird zum Ende der aktuellen Abrechnungsperiode gekündigt.
              Bis dahin kannst du alle Funktionen und Credits ganz normal weiter nutzen. Danach wechselst
              du automatisch zum kostenlosen Basic-Plan.
            </p>
          )}

          <DialogFooter>
            {cancelAt ? (
              <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Schliessen
              </Button>
            ) : (
              <Button onClick={handleCancel} disabled={loading} variant="destructive" className="w-full sm:w-auto">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Abo kündigen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'upgrade' ? 'Plan upgraden' : 'Plan wechseln'}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 pt-1">
            <PlanBadge plan={targetPlan} />
            <span>{formatPlanPrice(priceChf)}</span>
          </DialogDescription>
        </DialogHeader>

        {preview.status === 'none' ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Du wirst zur sicheren Stripe-Checkout-Seite weitergeleitet. Das Abo läuft monatlich und
            kann jederzeit über &quot;Abo verwalten&quot; in deinem Account gekündigt werden.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Dein Abo wird auf {PLAN_LABELS[targetPlan]} umgestellt. Das Abo läuft monatlich und kann
            jederzeit über &quot;Abo verwalten&quot; in deinem Account gekündigt werden.
            <br className="my-1" />
            {preview.status === 'loading' && (
              <span className="inline-flex items-center gap-1.5 mt-1.5 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" /> Berechne anteiligen Betrag…
              </span>
            )}
            {preview.status === 'ready' && preview.amount > 0 && (
              <span className="block mt-1.5 font-medium text-foreground">
                Dir werden {formatProration(preview.amount, preview.currency)} anteilig auf der
                nächsten Rechnung zusätzlich berechnet.
              </span>
            )}
            {preview.status === 'ready' && preview.amount < 0 && (
              <span className="block mt-1.5 font-medium text-foreground">
                Dir werden {formatProration(preview.amount, preview.currency)} anteilig auf der
                nächsten Rechnung gutgeschrieben.
              </span>
            )}
            {preview.status === 'ready' && preview.amount === 0 && (
              <span className="block mt-1.5 font-medium text-foreground">
                Es entstehen keine zusätzlichen Kosten.
              </span>
            )}
          </p>
        )}

        <DialogFooter>
          <Button onClick={handleCheckout} disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {mode === 'upgrade' ? 'Jetzt upgraden' : 'Plan wechseln'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
