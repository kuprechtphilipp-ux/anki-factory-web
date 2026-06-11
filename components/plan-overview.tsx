'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PlanBadge } from '@/components/plan-badge'
import { UpgradeDialog } from '@/components/upgrade-dialog'
import { PLAN_ORDER, DEFAULT_PLAN_CONFIG, formatPlanPrice, type PlanConfig } from '@/lib/plans'
import type { Plan } from '@/lib/types'

interface PlanOverviewProps {
  plan: Plan
  isAdmin?: boolean
  redeemedCode?: string | null
  planExpiresAt?: string | null
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function PlanOverview({ plan, isAdmin = false, redeemedCode = null, planExpiresAt = null }: PlanOverviewProps) {
  const [dialogPlan, setDialogPlan] = useState<Plan | null>(null)
  const [config, setConfig] = useState<PlanConfig>(DEFAULT_PLAN_CONFIG)

  useEffect(() => {
    fetch('/api/plan-config')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PlanConfig | null) => { if (d) setConfig(d) })
      .catch(() => {})
  }, [])

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
                    {isAdmin ? (
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
                      Upgrade
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
          targetPlan={dialogPlan}
          priceChf={config[dialogPlan].price_chf}
        />
      )}
    </div>
  )
}
