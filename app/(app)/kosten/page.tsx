'use client'

import { useState, useEffect } from 'react'
import { Loader2, DollarSign, Calendar, CalendarDays, Wallet, Mail, PartyPopper } from 'lucide-react'
import { PlanBadge } from '@/components/plan-badge'
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
  const pct = credits.total > 0 ? Math.min(1, credits.used / credits.total) : 0
  const exhausted = credits.used >= credits.total
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const dash = circumference * pct
  const colorClass = exhausted ? 'text-rose-500' : 'text-primary'

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
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
    </div>
  )
}

const PLAN_ORDER: Plan[] = ['basic', 'basic_plus', 'premium', 'ultra']

const PLAN_CREDITS: Record<Plan, number> = {
  basic: 50,
  basic_plus: 100,
  premium: 300,
  ultra: 500,
}

function UpgradeSection({ plan }: { plan: Plan }) {
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

const FEATURE_LABELS: Record<string, string> = {
  generieren: 'Karten generieren',
  prescan: 'PDF-Prescan',
  quiz: 'Quiz',
  schriftlich: 'Schriftliche Antwort',
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/50 p-5 bg-card shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">{icon}</div>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
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
          <UpgradeSection plan={(data.credits.plan as Plan) ?? 'basic'} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Anthropic API-Kosten</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={<DollarSign className="h-5 w-5 text-emerald-500" />} label="Heute" value={fmtUsd(data.heute)} />
          <StatCard icon={<Calendar className="h-5 w-5 text-blue-500" />} label="Diese Woche" value={fmtUsd(data.woche)} />
          <StatCard icon={<CalendarDays className="h-5 w-5 text-violet-500" />} label="Diesen Monat" value={fmtUsd(data.monat)} />
          <StatCard icon={<Wallet className="h-5 w-5 text-primary" />} label="Gesamt" value={fmtUsd(data.gesamt)} />
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
                  title={`${t.date}: ${fmtUsd(t.cost)}`}
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
                    <span className="text-muted-foreground">{fmtUsd(f.cost)} · {pct.toFixed(0)}% · {f.calls} Calls</span>
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
                  <th className="px-4 py-2.5 font-semibold text-right">Kosten</th>
                </tr>
              </thead>
              <tbody>
                {data.letzteAufrufe.map((row) => (
                  <tr key={row.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString('de', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5">{FEATURE_LABELS[row.feature] ?? row.feature}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.model}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {row.input_tokens.toLocaleString('de')} / {row.output_tokens.toLocaleString('de')}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium">{fmtUsd(row.cost_usd)}</td>
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
