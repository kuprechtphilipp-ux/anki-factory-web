import { Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

const ratings = [
  { label: 'Nochmal', colorClass: 'border-red-200 text-red-600 dark:border-red-900 dark:text-red-400' },
  { label: 'Schwer', colorClass: 'border-orange-200 text-orange-600 dark:border-orange-900 dark:text-orange-400' },
  { label: 'Gut', colorClass: 'border-blue-200 text-blue-600 dark:border-blue-900 dark:text-blue-400' },
  { label: 'Einfach', colorClass: 'border-emerald-200 text-emerald-600 dark:border-emerald-900 dark:text-emerald-400' },
]

export function PhoneMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative w-[260px] rounded-[2.5rem] border-[10px] border-foreground bg-foreground shadow-2xl',
        className
      )}
    >
      <div className="absolute left-1/2 top-0 z-10 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-foreground" />
      <div className="overflow-hidden rounded-[1.75rem] bg-card">
        <div className="flex flex-col gap-4 p-4 pt-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">3 / 12</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-secondary-foreground">
              Frage &amp; Antwort
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-muted">
            <div className="h-full w-1/4 rounded-full bg-gradient-to-r from-primary to-violet-400" />
          </div>

          <div className="rounded-2xl border border-border/50 bg-background p-4 shadow-sm">
            <p className="mb-2 text-[8px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Frage
            </p>
            <p className="text-sm font-medium leading-snug text-foreground">
              Was unterscheidet Mitose von Meiose?
            </p>
          </div>

          <div className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground">
            <Eye className="h-3.5 w-3.5" />
            Antwort zeigen
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {ratings.map((r) => (
              <div
                key={r.label}
                className={cn(
                  'flex items-center justify-center rounded-lg border-2 py-1.5 text-center text-[8px] font-semibold leading-none',
                  r.colorClass
                )}
              >
                {r.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
