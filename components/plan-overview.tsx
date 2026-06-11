'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlanBadge } from '@/components/plan-badge'
import { UpgradeDialog } from '@/components/upgrade-dialog'
import { PLAN_ORDER, PLAN_CREDITS, PLAN_DESCRIPTIONS, PLAN_PRICES } from '@/lib/plans'
import type { Plan } from '@/lib/types'

export function PlanOverview({ plan }: { plan: Plan }) {
  const [dialogPlan, setDialogPlan] = useState<Plan | null>(null)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/50 bg-card p-2 shadow-card hover:shadow-card-hover transition-all duration-200 divide-y divide-border/50">
        {PLAN_ORDER.map((p) => {
          const isCurrent = p === plan
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
                    {PLAN_CREDITS[p]} Credits / Monat
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{PLAN_DESCRIPTIONS[p]}</p>
              </div>
              <div className="shrink-0 text-right">
                {isCurrent ? (
                  <span className="text-xs font-semibold text-primary whitespace-nowrap">Aktueller Plan</span>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{PLAN_PRICES[p]}</p>
                    <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => setDialogPlan(p)}>
                      {p === 'ultra' ? 'Anfragen' : 'Upgrade'}
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
        />
      )}
    </div>
  )
}
