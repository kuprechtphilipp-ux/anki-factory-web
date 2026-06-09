'use client'

import { useState, useEffect } from 'react'
import { Loader2, Flame, TrendingUp, Star, Calendar, Brain, Target } from 'lucide-react'

interface StatsData {
  streak: number
  bestStreak: number
  totalReviews: number
  todayReviews: number
  retentionRate: number
  heatmap: { date: string; count: number }[]
  totalCards: number
  weekTotal: number
  avgCardsPerDay: number
}

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const DAYS = ['Mo', '', 'Mi', '', 'Fr', '', 'So']

function getHeatmapColor(count: number): string {
  if (count === 0) return 'bg-muted/60'
  if (count <= 5) return 'bg-emerald-200 dark:bg-emerald-900'
  if (count <= 15) return 'bg-emerald-400 dark:bg-emerald-700'
  return 'bg-emerald-600 dark:bg-emerald-500'
}

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 bg-card shadow-card ${highlight ? 'border-primary/30' : 'border-border/50'}`}>
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

export default function StatistikPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then((data: StatsData) => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 text-muted-foreground py-20 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Lade Statistiken…</span>
      </div>
    )
  }

  if (!stats) {
    return <div className="py-12 text-sm text-muted-foreground">Statistiken konnten nicht geladen werden.</div>
  }

  const heatmap = stats.heatmap
  const weeks: { date: string; count: number }[][] = []
  const weekLabels: { weekIdx: number; label: string }[] = []
  let week: { date: string; count: number }[] = []
  let lastMonth = -1

  for (let i = 0; i < heatmap.length; i++) {
    const d = new Date(heatmap[i].date + 'T00:00:00')
    const dow = (d.getDay() + 6) % 7

    if (i === 0) {
      for (let p = 0; p < dow; p++) week.push({ date: '', count: -1 })
    }

    week.push(heatmap[i])

    if (dow === 6 || i === heatmap.length - 1) {
      while (week.length < 7) week.push({ date: '', count: -1 })
      weeks.push(week)
      const month = d.getMonth()
      if (month !== lastMonth) {
        weekLabels.push({ weekIdx: weeks.length - 1, label: MONTHS[month] })
        lastMonth = month
      }
      week = []
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Lernfortschritt</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight">Statistik</h1>
      </div>

      {/* Streak banner */}
      {stats.streak > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-orange-300/50 dark:border-orange-700/50 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20 px-6 py-5">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[80px] leading-none select-none pointer-events-none opacity-20">🔥</div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 dark:bg-orange-900/40">
              <Flame className="h-7 w-7 text-orange-500" />
            </div>
            <div>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {stats.streak} {stats.streak === 1 ? 'Tag' : 'Tage'}
              </p>
              <p className="text-sm text-orange-700/70 dark:text-orange-300/70">
                Aktuelle Lernserie{stats.bestStreak > stats.streak ? ` · Bestleistung: ${stats.bestStreak} Tage` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.streak === 0 && stats.bestStreak > 0 && (
        <div className="rounded-2xl border border-border/50 bg-muted/30 px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Kein aktiver Streak — dein Rekord war{' '}
            <span className="font-semibold text-foreground">{stats.bestStreak} Tage</span>. Heute lernen, um wieder anzufangen! 🎯
          </p>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          label="Längste Serie"
          value={`${stats.bestStreak} Tg`}
          highlight={stats.bestStreak > 7}
        />
        <StatCard
          icon={<Calendar className="h-5 w-5 text-blue-500" />}
          label="Diese Woche"
          value={stats.weekTotal}
          sub="Karten"
        />
        <StatCard
          icon={<Target className="h-5 w-5 text-violet-500" />}
          label="Ø Karten/Tag"
          value={stats.avgCardsPerDay}
          sub="30 Tage"
        />
        <StatCard
          icon={<Brain className="h-5 w-5 text-primary" />}
          label="Reviews gesamt"
          value={stats.totalReviews.toLocaleString('de')}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
          label="Retention"
          value={`${stats.retentionRate}%`}
          sub="Rating ≥ Gut"
        />
        <StatCard
          icon={<Star className="h-5 w-5 text-amber-500" />}
          label="Karten im Deck"
          value={stats.totalCards.toLocaleString('de')}
        />
      </div>

      {/* Heatmap */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4">
          Lernaktivität — letzte 365 Tage
        </p>
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Month labels */}
            <div className="flex mb-1 pl-7">
              {weeks.map((_, wi) => {
                const lbl = weekLabels.find(l => l.weekIdx === wi)
                return (
                  <div key={wi} className="flex-1 text-[10px] text-muted-foreground/60">
                    {lbl?.label ?? ''}
                  </div>
                )
              })}
            </div>

            {/* Grid */}
            <div className="flex gap-0">
              {/* Day-of-week labels */}
              <div className="flex flex-col gap-[3px] mr-1.5 shrink-0">
                {DAYS.map((d, i) => (
                  <div key={i} className="h-[11px] text-[9px] text-muted-foreground/50 leading-[11px] w-5 text-right">
                    {d}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              {weeks.map((wk, wi) => (
                <div key={wi} className="flex flex-col gap-[3px] flex-1">
                  {wk.map((cell, di) => {
                    if (cell.count < 0) {
                      return <div key={di} className="h-[11px] rounded-sm" />
                    }
                    const isToday = cell.date === today
                    return (
                      <div
                        key={di}
                        className={`h-[11px] rounded-sm transition-transform hover:scale-125 cursor-default ${getHeatmapColor(cell.count)} ${isToday ? 'ring-1 ring-primary ring-offset-1' : ''}`}
                        title={cell.date ? `${cell.date}: ${cell.count} Karte${cell.count !== 1 ? 'n' : ''}` : ''}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 justify-end">
              <span className="text-[10px] text-muted-foreground/60">Weniger</span>
              {[0, 3, 8, 16].map((n) => (
                <div key={n} className={`h-[11px] w-[11px] rounded-sm ${getHeatmapColor(n)}`} />
              ))}
              <span className="text-[10px] text-muted-foreground/60">Mehr</span>
            </div>
          </div>
        </div>
      </div>

      {/* Retention detail */}
      {stats.totalReviews > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4">Retention Rate</p>
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Korrekte Antworten (Rating Gut / Einfach)</span>
              <span className="font-semibold text-foreground">{stats.retentionRate}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  stats.retentionRate >= 85 ? 'bg-emerald-500' :
                  stats.retentionRate >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${stats.retentionRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.retentionRate >= 90 ? '🌟 Ausgezeichnet! Du erinnerst dich an fast alles.' :
               stats.retentionRate >= 80 ? '✅ Gut! Ziel: 85–90%.' :
               stats.retentionRate >= 70 ? '⚠️ Okay. Mehr regelmäßige Reviews helfen.' :
               '🔁 Karten werden zu selten wiederholt — öfter üben!'}
            </p>
          </div>
        </div>
      )}

      {stats.totalReviews === 0 && (
        <div className="rounded-2xl border border-border/50 bg-muted/20 p-8 text-center space-y-2">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-muted">
            <Brain className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-base font-medium mt-4">Noch keine Lernaktivität</p>
          <p className="text-sm text-muted-foreground">Sobald du Karten reviewst, erscheinen hier deine Statistiken.</p>
        </div>
      )}
    </div>
  )
}
