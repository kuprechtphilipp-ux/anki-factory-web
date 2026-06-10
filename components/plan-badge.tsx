import { Crown, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Plan } from '@/lib/types'

const PLAN_CONFIG: Record<Plan, { label: string; className: string; icon?: React.ReactNode }> = {
  basic: {
    label: 'Basic',
    className: 'border-transparent bg-secondary text-secondary-foreground',
  },
  basic_plus: {
    label: 'Basic+',
    className: 'border-transparent bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm shadow-blue-500/20',
    icon: <Zap className="h-3 w-3" />,
  },
  premium: {
    label: 'Premium',
    className: 'border-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-sm shadow-fuchsia-500/20',
    icon: <Sparkles className="h-3 w-3" />,
  },
  ultra: {
    label: 'Ultra',
    className: 'border-transparent bg-gradient-to-r from-amber-400 via-orange-400 to-amber-600 text-white shadow-sm shadow-amber-500/30',
    icon: <Crown className="h-3 w-3" />,
  },
}

export function PlanBadge({ plan, className }: { plan: Plan; className?: string }) {
  const cfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.basic
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        cfg.className,
        className
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}
