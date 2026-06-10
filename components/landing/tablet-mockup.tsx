import { Brain, Eye, FileUp, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const ratings = [
  { label: 'Nochmal', colorClass: 'border-red-200 text-red-600 dark:border-red-900 dark:text-red-400' },
  { label: 'Schwer', colorClass: 'border-orange-200 text-orange-600 dark:border-orange-900 dark:text-orange-400' },
  { label: 'Gut', colorClass: 'border-blue-200 text-blue-600 dark:border-blue-900 dark:text-blue-400' },
  { label: 'Einfach', colorClass: 'border-emerald-200 text-emerald-600 dark:border-emerald-900 dark:text-emerald-400' },
]

export function TabletMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative mx-auto w-full rounded-[1.75rem] border-[10px] border-foreground bg-foreground shadow-2xl',
        className
      )}
    >
      <div className="absolute left-1/2 top-1 z-10 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-muted-foreground/40" />

      <div className="grid aspect-[4/3] grid-cols-2 divide-x divide-border/60 overflow-hidden rounded-[1rem] bg-card">
        {/* Links: Generieren */}
        <div className="flex flex-col gap-3 p-4">
          <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Generieren
          </span>

          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-3 text-center">
            <FileUp className="h-6 w-6 text-primary" />
            <p className="text-[9px] font-medium text-muted-foreground">PDF hierher ziehen</p>
          </div>

          <div className="space-y-1.5">
            <div className="h-2 w-full rounded bg-muted-foreground/20" />
            <div className="h-2 w-3/4 rounded bg-gradient-to-r from-primary to-violet-400" />
            <div className="h-2 w-5/6 rounded bg-muted-foreground/20" />
          </div>
        </div>

        {/* Rechts: Lernen */}
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Brain className="h-3 w-3 text-primary" />
              Lernen
            </span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-secondary-foreground">
              3 / 12
            </span>
          </div>

          <div className="rounded-xl border border-border/50 bg-background p-3 shadow-sm">
            <p className="mb-1.5 text-[8px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Frage
            </p>
            <p className="text-xs font-medium leading-snug text-foreground">
              Was unterscheidet Mitose von Meiose?
            </p>
          </div>

          <div className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary text-[11px] font-semibold text-primary-foreground">
            <Eye className="h-3.5 w-3.5" />
            Antwort zeigen
          </div>

          <div className="grid grid-cols-2 gap-1.5">
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
