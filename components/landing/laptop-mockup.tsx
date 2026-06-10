import { FileUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LaptopMockup({ className }: { className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-md', className)}>
      <div className="rounded-t-xl border border-border/60 bg-card p-3 shadow-card sm:p-4">
        <div className="mb-3 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-3 sm:grid-cols-[100px_1fr]">
          <div className="space-y-2 rounded-lg bg-muted/40 p-2">
            <div className="h-2 w-3/4 rounded bg-muted-foreground/30" />
            <div className="h-2 w-1/2 rounded bg-primary/40" />
            <div className="h-2 w-2/3 rounded bg-muted-foreground/20" />
            <div className="h-2 w-1/2 rounded bg-muted-foreground/20" />
            <div className="h-2 w-2/3 rounded bg-muted-foreground/20" />
          </div>
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center sm:p-10">
            <FileUp className="h-6 w-6 text-primary" />
            <p className="text-[10px] font-medium text-muted-foreground">PDF hierher ziehen</p>
          </div>
        </div>
      </div>
      <div className="mx-auto h-3 rounded-b-xl bg-foreground/80" />
      <div className="mx-auto h-1.5 w-24 rounded-b-md bg-foreground/50" />
    </div>
  )
}
