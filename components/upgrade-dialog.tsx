'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { PlanBadge } from '@/components/plan-badge'
import { formatPlanPrice } from '@/lib/plans'
import type { Plan } from '@/lib/types'

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetPlan: Plan
  priceChf: number | null
}

export function UpgradeDialog({ open, onOpenChange, targetPlan, priceChf }: UpgradeDialogProps) {
  const [loading, setLoading] = useState(false)

  async function handleCheckout() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Checkout konnte nicht gestartet werden')
        return
      }
      window.location.href = data.url
    } catch {
      toast.error('Checkout konnte nicht gestartet werden')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Plan upgraden</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 pt-1">
            <PlanBadge plan={targetPlan} />
            <span>{formatPlanPrice(priceChf)}</span>
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Du wirst zur sicheren Stripe-Checkout-Seite weitergeleitet. Das Abo läuft monatlich und
          kann jederzeit über &quot;Abo verwalten&quot; in deinem Account gekündigt werden.
        </p>

        <DialogFooter>
          <Button onClick={handleCheckout} disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Jetzt upgraden
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
