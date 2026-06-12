'use client'

import { useState, useEffect, useCallback } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { PlanBadge } from '@/components/plan-badge'
import { PlanOverview } from '@/components/plan-overview'
import { RedeemInviteCode } from '@/components/redeem-invite-code'
import { PLAN_UPDATED_EVENT } from '@/lib/plans'
import type { Plan } from '@/lib/types'

interface ProfilePlanData {
  plan: Plan
  credits_total: number
  credits_used: number
  credits_reset_at: string
  redeemed_code: string | null
  is_admin: boolean
  stripe_cancel_at: string | null
}

export function PlanBanner() {
  const [data, setData] = useState<ProfilePlanData | null>(null)
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const load = useCallback(() => {
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ProfilePlanData | null) => { if (d) setData(d) })
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.addEventListener(PLAN_UPDATED_EVENT, load)
    return () => window.removeEventListener(PLAN_UPDATED_EVENT, load)
  }, [load])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (!data) return null

  const trigger = (
    <button
      data-tour="plan-banner"
      onClick={isMobile ? () => setOpen(true) : undefined}
      className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/50 hover:bg-muted px-2.5 py-1.5 text-xs transition-colors mr-2"
      aria-label="Plan & Credits"
    >
      <PlanBadge plan={data.plan} />
    </button>
  )

  const body = (
    <div className="space-y-4">
      <div className={`flex items-center justify-between text-sm ${isMobile ? 'pr-7' : ''}`}>
        <span className="text-muted-foreground">Credits genutzt</span>
        <span className="font-semibold tabular-nums">
          {data.credits_used} / {data.credits_total}
        </span>
      </div>
      {data.credits_reset_at && (
        <p className="text-xs text-muted-foreground">
          Nächster Reset:{' '}
          {new Date(data.credits_reset_at).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </p>
      )}
      <Separator />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-2">
          Dein Plan
        </p>
        <PlanOverview
          plan={data.plan}
          isAdmin={data.is_admin}
          redeemedCode={data.redeemed_code}
          stripeCancelAt={data.stripe_cancel_at}
          onChanged={load}
        />
      </div>
      <Separator />
      <details>
        <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 hover:text-foreground transition-colors">
          Einladungscode
        </summary>
        <div className="mt-2">
          <RedeemInviteCode
            redeemedCode={data.redeemed_code}
            onRedeemed={(plan, credits) => {
              setData((prev) => prev ? { ...prev, plan, credits_total: credits, credits_used: 0 } : prev)
              load()
            }}
          />
        </div>
      </details>
    </div>
  )

  if (isMobile) {
    return (
      <>
        {trigger}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            overlayClassName="bg-black/50"
            className="w-[calc(100vw-2rem)] max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl p-4"
          >
            <DialogTitle className="sr-only">Plan & Credits</DialogTitle>
            {body}
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        {body}
      </PopoverContent>
    </Popover>
  )
}
