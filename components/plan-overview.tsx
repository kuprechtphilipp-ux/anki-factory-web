import { PartyPopper, Mail } from 'lucide-react'
import { PlanBadge } from '@/components/plan-badge'
import { PLAN_ORDER, PLAN_CREDITS } from '@/lib/plans'
import type { Plan } from '@/lib/types'

export function PlanOverview({ plan }: { plan: Plan }) {
  if (plan === 'ultra') {
    return (
      <div className="rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
            <PartyPopper className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Du bist auf dem Ultra-Plan — dem höchsten verfügbaren Zugang.</p>
            <p className="text-sm text-muted-foreground mt-0.5">Mehr Credits gibt es aktuell nicht. Viel Spaß beim Lernen!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PLAN_ORDER.map((p) => (
          <div
            key={p}
            className={`rounded-xl border p-3 text-center space-y-1.5 transition-colors ${
              p === plan ? 'border-primary/40 bg-primary/5' : 'border-border/50'
            }`}
          >
            <PlanBadge plan={p} />
            <p className="text-lg font-bold tracking-tight">{PLAN_CREDITS[p]}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Credits</p>
          </div>
        ))}
      </div>
      <a
        href="mailto:philipp.kuprecht@student.unisg.ch?subject=Anki%20Factory%20-%20Plan-Upgrade"
        className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
      >
        <Mail className="h-4 w-4" />
        Mehr Credits? Schreib mir für ein Upgrade
      </a>
    </div>
  )
}
