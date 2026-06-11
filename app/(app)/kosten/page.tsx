'use client'

import { useState, useEffect } from 'react'
import { Loader2, Coins, Calendar, CalendarDays, Wallet, PartyPopper } from 'lucide-react'
import { PlanBadge } from '@/components/plan-badge'
import { PlanOverview } from '@/components/plan-overview'
import { UpgradeDialog } from '@/components/upgrade-dialog'
import { Button } from '@/components/ui/button'
import { PLAN_ORDER } from '@/lib/plans'
import { usdToCredits } from '@/lib/api-cost'
import { getDisplayModelName } from '@/lib/model-names'
import type { Plan } from '@/lib/types'

interface ProFeature {
  feature: string
  cost: number
  calls: number
}

interface ProTag {
  date: string
  cost: number
}

interface AufrufRow {
  id: number
  created_at: string
  feature: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

interface CreditsInfo {
  plan: string
  total: number
  used: number
  remaining: number
  isAdmin: boolean
  redeemedCode: string | null
}

interface KostenData {
  heute: number
  woche: number
  monat: number
  gesamt: number
  proFeature: ProFeature[]
  proTag: ProTag[]
  letzteAufrufe: AufrufRow[]
  credits: CreditsInfo
}

function CreditsDonut({ credits }: { credits: CreditsInfo }) {
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const pct = credits.total > 0 ? Math.min(1, credits.used / credits.total) : 0
  const exhausted = credits.used >= credits.total
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const dash = circumference * pct
  const colorClass = exhausted ? 'text-rose-500' : 'text-primary'

  const plan = (credits.plan as Plan) ?? 'basic'
  const isUltra = plan === 'ultra'
  const planIndex = PLAN_ORDER.indexOf(plan)
  const nextPlan = isUltra ? 'ultra' : PLAN_ORDER[planIndex + 1] ?? 'ultra'

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/50 bg-card p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center gap-6">
        <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0 -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            className={`${colorClass} stroke-current transition-all`}
          />
        </svg>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
            Dein Plan
          </p>
          <PlanBadge plan={(credits.plan as Plan) ?? 'basic'} className="mb-2" />
          <p className="text-2xl font-bold tracking-tight">
            {credits.used} / {credits.total}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">Credits verbraucht</p>
        </div>
      </div>
      {exhausted && (
        <p className="mt-4 text-sm text-rose-500">
          Deine Credits sind aufgebraucht. Schreib mir für mehr Credits:{' '}
          <a href="mailto:philipp.kuprecht@student.unisg.ch" className="underline underline-offset-2">
            philipp.kuprecht@student.unisg.ch
          </a>
        </p>
      )}
      <div className="mt-auto pt-4 border-t border-border/50">
        {isUltra ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PartyPopper className="h-4 w-4 shrink-0 text-amber-500" />
            <span>Höchster Plan erreicht — mehr Credits gibt es aktuell nicht.</span>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setUpgradeOpen(true)}>
            Upgrade
          </Button>
        )}
      </div>
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} targetPlan={nextPlan} />
    </div>
  )
}

const FEATURE_LABELS: Record<string, string> = {
  generieren: 'Karten generieren',
  prescan: 'PDF-Prescan',
  quiz: 'Quiz',
  schriftlich: 'Schriftliche Antwort',
}

function fmtCredits(costUsd: number): string {
  return usdToCredits(costUsd).toLocaleString('de')
}

function StatCard({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode
  label: string
  value: string
  unit?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 p-5 bg-card shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">{icon}</div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold tracking-tight">
          {value}
          {unit && <span className="ml-1 text-base font-medium text-muted-foreground">{unit}</span>}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function KostenPage() {
  const [data, setData] = useState<KostenData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/kosten')
      .then(r => r.json())
      .then((d: KostenData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 text-muted-foreground py-20 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Lade Kosten…</span>
      </div>
    )
  }

  if (!data) {
    return <div className="py-12 text-sm text-muted-foreground">Kosten konnten nicht geladen werden.</div>
  }

  const maxBar = Math.max(...data.proTag.map(t => t.cost), 0.000001)
  const totalFeatureCost = data.proFeature.reduce((sum, f) => sum + f.cost, 0)

  return (
    <div className="max-w-3xl space-y-10 animate-fade-in">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Plan & Nutzung</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight">AI Credits</h1>
      </div>

      {/* Credits + Upgrade */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Dein Zugang</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
          <CreditsDonut credits={data.credits} />
          <PlanOverview plan={(data.credits.plan as Plan) ?? 'basic'} isAdmin={data.credits.isAdmin} redeemedCode={data.credits.redeemedCode} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Cramo API-Kosten</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={<Coins className="h-5 w-5 text-emerald-500" />} label="Heute" value={fmtCredits(data.heute)} unit="Credits" />
          <StatCard icon={<Calendar className="h-5 w-5 text-blue-500" />} label="Diese Woche" value={fmtCredits(data.woche)} unit="Credits" />
          <StatCard icon={<CalendarDays className="h-5 w-5 text-violet-500" />} label="Diesen Monat" value={fmtCredits(data.monat)} unit="Credits" />
          <StatCard icon={<Wallet className="h-5 w-5 text-primary" />} label="Gesamt" value={fmtCredits(data.gesamt)} unit="Credits" />
        </div>
      </div>

      {/* 30-Tage Chart */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Kosten — letzte 30 Tage</p>
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-end gap-[3px] h-24">
            {data.proTag.map((t, i) => (
              <div key={t.date} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max(2, (t.cost / maxBar) * 72)}px`,
                    background: t.cost > 0
                      ? (i === data.proTag.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.4)')
                      : 'hsl(var(--muted))',
                  }}
                  title={`${t.date}: ${fmtCredits(t.cost)} Credits`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground/50">
            <span>{data.proTag[0]?.date}</span>
            <span>{data.proTag[data.proTag.length - 1]?.date}</span>
          </div>
        </div>
      </div>

      {/* Kosten pro Feature */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Kosten pro Feature</p>
        {data.proFeature.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Noch keine API-Aufrufe erfasst.
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 space-y-4">
            {data.proFeature.map((f) => {
              const pct = totalFeatureCost > 0 ? (f.cost / totalFeatureCost) * 100 : 0
              return (
                <div key={f.feature} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{FEATURE_LABELS[f.feature] ?? f.feature}</span>
                    <span className="text-muted-foreground">{fmtCredits(f.cost)} Credits · {pct.toFixed(0)}% · {f.calls} Calls</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Letzte API-Calls */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Letzte API-Calls</p>
        {data.letzteAufrufe.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Noch keine API-Aufrufe erfasst.
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  <th className="px-4 py-2.5 font-semibold">Datum</th>
                  <th className="px-4 py-2.5 font-semibold">Feature</th>
                  <th className="px-4 py-2.5 font-semibold">Modell</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Tokens</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Credits</th>
                </tr>
              </thead>
              <tbody>
                {data.letzteAufrufe.map((row) => (
                  <tr key={row.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString('de', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5">{FEATURE_LABELS[row.feature] ?? row.feature}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{getDisplayModelName(row.model)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {row.input_tokens.toLocaleString('de')} / {row.output_tokens.toLocaleString('de')}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmtCredits(row.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
