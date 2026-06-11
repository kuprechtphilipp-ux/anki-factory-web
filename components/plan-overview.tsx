'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanBadge } from '@/components/plan-badge'
import { UpgradeDialog } from '@/components/upgrade-dialog'
import { toast } from 'sonner'
import { PLAN_ORDER, DEFAULT_PLAN_CONFIG, PLAN_UPDATED_EVENT, formatPlanPrice, type PlanConfig } from '@/lib/plans'
import type { Plan } from '@/lib/types'

interface PlanOverviewProps {
  plan: Plan
  isAdmin?: boolean
  redeemedCode?: string | null
  planExpiresAt?: string | null
  stripeCancelAt?: string | null
  onChanged?: () => void
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function buttonLabel(targetPlan: Plan, currentPlan: Plan): string {
  if (targetPlan === 'basic') return 'Kündigen'
  return PLAN_ORDER.indexOf(targetPlan) > PLAN_ORDER.indexOf(currentPlan) ? 'Upgrade' : 'Auswählen'
}

export function PlanOverview({ plan, isAdmin = false, redeemedCode = null, planExpiresAt = null, stripeCancelAt = null, onChanged }: PlanOverviewProps) {
  const [dialogPlan, setDialogPlan] = useState<Plan | null>(null)
  const [config, setConfig] = useState<PlanConfig>(DEFAULT_PLAN_CONFIG)
  const [reactivating, setReactivating] = useState(false)

  useEffect(() => {
    fetch('/api/plan-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PlanConfig | null) => { if (d) setConfig(d) })
      .catch(() => {})
  }, [])

  async function handleReactivate() {
    setReactivating(true)
    try {
      const res = await fetch('/api/billing/cancel', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        toast.error(data.error ?? 'Abo konnte nicht reaktiviert werden')
        return
      }
      toast.success('Abo reaktiviert', { description: 'Dein Plan läuft wie gewohnt weiter.' })
      onChanged?.()
      window.dispatchEvent(new Event(PLAN_UPDATED_EVENT))
    } catch {
      toast.error('Abo konnte nicht reaktiviert werden')
    } finally {
      setReactivating(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/50 bg-card p-2 shadow-card hover:shadow-card-hover transition-all duration-200 divide-y divide-border/50">
        {PLAN_ORDER.map((p) => {
          const isCurrent = p === plan
          const entry = config[p]
          return (
            <div
              key={p}
              className={`flex items-center justify-between gap-3 rounded-xl p-3 ${
                isCurrent ? 'bg-primary/5' : ''
              }`}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <PlanBadge plan={p} />
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {entry.credits} Credits / Monat
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
              </div>
              <div className="shrink-0 text-right">
                {isCurrent ? (
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-primary whitespace-nowrap">Aktueller Plan</span>
                    {stripeCancelAt ? (
                      <div className="space-y-1">
                        <p className="text-xs text-rose-500 font-medium whitespace-nowrap">
                          Gekündigt — läuft bis {fmtDate(stripeCancelAt)}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px]"
                          onClick={handleReactivate}
                          disabled={reactivating}
                        >
                          {reactivating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          Reaktivieren
                        </Button>
                      </div>
                    ) : isAdmin ? (
                      <p className="text-xs font-semibold text-amber-500 whitespace-nowrap">Owner</p>
                    ) : redeemedCode && entry.price_chf !== null ? (
                      <div className="text-xs leading-tight">
                        <p className="text-muted-foreground line-through whitespace-nowrap">{formatPlanPrice(entry.price_chf)}</p>
                        <p className="text-emerald-600 font-medium whitespace-nowrap">
                          {planExpiresAt ? `Free via Promocode bis ${fmtDate(planExpiresAt)}` : 'Free via Promocode'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground whitespace-nowrap">{formatPlanPrice(entry.price_chf)}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{formatPlanPrice(entry.price_chf)}</p>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => setDialogPlan(p)}>
                      {buttonLabel(p, plan)}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {dialogPlan && (
        <UpgradeDialog
          open={!!dialogPlan}
          onOpenChange={(open) => { if (!open) setDialogPlan(null) }}
          currentPlan={plan}
          targetPlan={dialogPlan}
          priceChf={config[dialogPlan].price_chf}
          onChanged={onChanged}
        />
      )}
    </div>
  )
}
