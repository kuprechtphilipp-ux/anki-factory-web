'use client'

import { useState, useEffect, useCallback } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { PlanBadge } from '@/components/plan-badge'
import { PlanOverview } from '@/components/plan-overview'
import { RedeemInviteCode } from '@/components/redeem-invite-code'
import type { Plan } from '@/lib/types'

interface ProfilePlanData {
  plan: Plan
  credits_total: number
  credits_used: number
  redeemed_code: string | null
}

export function PlanBanner() {
  const [data, setData] = useState<ProfilePlanData | null>(null)

  const load = useCallback(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ProfilePlanData | null) => { if (d) setData(d) })
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  if (!data) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          data-tour="plan-banner"
          className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/50 hover:bg-muted px-2.5 py-1.5 text-xs transition-colors mr-2"
          aria-label="Plan & Credits"
        >
          <PlanBadge plan={data.plan} />
          <span className="text-muted-foreground tabular-nums">
            {data.credits_used}/{data.credits_total}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
            Dein Plan
          </p>
          <PlanOverview plan={data.plan} />
        </div>
        <Separator />
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Einladungscode
          </p>
          <RedeemInviteCode
            redeemedCode={data.redeemed_code}
            onRedeemed={(plan, credits) => {
              setData((prev) => prev ? { ...prev, plan, credits_total: credits, credits_used: 0 } : prev)
              load()
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
