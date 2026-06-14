'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Flame, TrendingUp, TrendingDown, Minus, Star, Calendar, Brain, Target, ChevronUp, ChevronDown, Activity, Trophy, Info } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { StatsData, ThemaBreakdownRow, SessionTrendPoint } from '@/lib/types'

const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
const DAYS = ['Mo', '', 'Mi', '', 'Fr', '', 'So']
const HEATMAP_COMPACT_DAYS = 91

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
  info,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  info?: string
  highlight?: boolean
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 bg-card shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 ${highlight ? 'border-primary/30' : 'border-border/50'}`}>
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">{icon}</div>
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
      <div className="mt-4">
        <div className="flex items-center gap-1.5">
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {info && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  aria-label={`Info zu ${label}`}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 text-sm leading-relaxed" side="top">
                {info}
              </PopoverContent>
            </Popover>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── D: Donut-Chart (mehrere Segmente) ──
function Donut({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  const r = 15.915
  const circ = 2 * Math.PI * r
  let cumulative = 0

  return (
    <svg viewBox="0 0 36 36" className="h-24 w-24 shrink-0">
      <circle cx="18" cy="18" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
      {total > 0 && segments.map((seg, i) => {
        if (seg.value === 0) return null
        const pct = seg.value / total
        const dash = pct * circ
        const offset = -(cumulative / total) * circ
        cumulative += seg.value
        return (
          <circle
            key={i}
            cx="18" cy="18" r={r} fill="none"
            stroke={seg.color} strokeWidth="4"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={offset}
            transform="rotate(-90 18 18)"
          />
        )
      })}
      <text x="18" y="20.5" textAnchor="middle" fontSize="6.5" fontWeight="700" className="fill-foreground">
        {total}
      </text>
    </svg>
  )
}

function DonutCard({ title, segments }: { title: string; segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">{title}</p>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Keine Daten vorhanden.</p>
      ) : (
        <div className="flex items-center gap-4">
          <Donut segments={segments} />
          <div className="flex-1 space-y-1.5">
            {segments.map((seg, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: seg.color }} />
                  {seg.label}
                </span>
                <span className="font-medium tabular-nums">
                  {seg.value} <span className="text-muted-foreground">({total > 0 ? Math.round((seg.value / total) * 100) : 0}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── B: FSRS-Forecast Bar-Chart ──
function ForecastChart({ forecast30 }: { forecast30: number[] }) {
  const [days, setDays] = useState<7 | 30>(7)
  const data = forecast30.slice(0, days)
  const maxBar = Math.max(...data, 1)

  function dayLabel(dayOffset: number): string {
    const d = new Date()
    d.setDate(d.getDate() + dayOffset)
    return d.toLocaleDateString('de-DE', { weekday: 'short' })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Fällige Karten im FSRS-Forecast</p>
        <div className="flex items-center gap-1 rounded-lg border border-border/50 p-0.5">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                days === d ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {d} Tage
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
        <div className="flex items-end gap-[3px] h-24">
          {data.map((count, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${Math.max(2, (count / maxBar) * 72)}px`,
                  background: count > 0
                    ? (i === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.4)')
                    : 'hsl(var(--muted))',
                }}
                title={`${count} Karten`}
              />
              {days === 7 && (
                <span className="text-[9px] font-medium text-muted-foreground/60 leading-none">{dayLabel(i)}</span>
              )}
            </div>
          ))}
        </div>
        {days === 30 && (
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground/50">
            <span>Heute</span>
            <span>+30 Tage</span>
          </div>
        )}
        <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground/50">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary inline-block" />Heute</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary/40 inline-block" />Folgetage</span>
        </div>
      </div>
    </div>
  )
}

// ── C: Performance-Sparkline ──
function Sparkline({ label, data, color }: { label: string; data: SessionTrendPoint[]; color: string }) {
  const w = 120
  const h = 36

  const avg = (arr: SessionTrendPoint[]) => arr.length > 0 ? arr.reduce((s, d) => s + d.score_pct, 0) / arr.length : null

  const last5 = data.slice(-5)
  const prev5 = data.slice(-10, -5)
  const avgLast = avg(last5)
  const avgPrev = avg(prev5)
  const trend = avgLast != null && avgPrev != null && prev5.length > 0 ? avgLast - avgPrev : null

  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * w : w / 2
    const y = h - (Math.max(0, Math.min(100, d.score_pct)) / 100) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        {avgLast != null && <span className="text-lg font-bold tabular-nums">{Math.round(avgLast)}%</span>}
      </div>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3">Noch keine Sessions.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9" preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {trend == null ? (
              <span>{data.length} Session{data.length !== 1 ? 's' : ''}</span>
            ) : trend > 1 ? (
              <span className="flex items-center gap-1 text-emerald-500"><TrendingUp className="h-3 w-3" />+{trend.toFixed(0)}% vs. davor</span>
            ) : trend < -1 ? (
              <span className="flex items-center gap-1 text-rose-500"><TrendingDown className="h-3 w-3" />{trend.toFixed(0)}% vs. davor</span>
            ) : (
              <span className="flex items-center gap-1"><Minus className="h-3 w-3" />± vs. davor</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ── A: Kurs/Thema-Breakdown Tabelle ──
type SortKey = 'kurs_name' | 'thema_name' | 'due' | 'neu' | 'total' | 'retention'

function SortableTh({
  label, sortKey, currentKey, dir, onClick, align,
}: {
  label: string
  sortKey: SortKey
  currentKey: SortKey
  dir: 'asc' | 'desc'
  onClick: (key: SortKey) => void
  align?: 'right'
}) {
  return (
    <th
      className={`px-3 py-2 font-semibold cursor-pointer select-none whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onClick(sortKey)}
    >
      <span className={`inline-flex items-center gap-0.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        {currentKey === sortKey && (dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  )
}

function ThemenBreakdownTable({ rows }: { rows: ThemaBreakdownRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('due')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    }
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
  })

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Noch keine Themen vorhanden.
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card shadow-card hover:shadow-card-hover transition-shadow duration-200 overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-border/50 text-[10px] uppercase tracking-widest text-muted-foreground/70">
            <SortableTh label="Kurs" sortKey="kurs_name" currentKey={sortKey} dir={sortDir} onClick={toggleSort} />
            <SortableTh label="Thema" sortKey="thema_name" currentKey={sortKey} dir={sortDir} onClick={toggleSort} />
            <SortableTh label="Fällig" sortKey="due" currentKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
            <SortableTh label="Neu" sortKey="neu" currentKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
            <SortableTh label="Total" sortKey="total" currentKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
            <SortableTh label="Retention" sortKey="retention" currentKey={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
            <th className="px-3 py-2 font-semibold text-left whitespace-nowrap">Letzte Aktivität</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.thema_id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.kurs_name}</td>
              <td className="px-3 py-2 font-medium whitespace-nowrap">
                <Link
                  href={`/${encodeURIComponent(row.kurs_name)}/${encodeURIComponent(row.thema_name)}`}
                  className="hover:text-primary transition-colors"
                >
                  {row.thema_name}
                </Link>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {row.due > 0 ? (
                  <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-bold">{row.due}</span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{row.neu}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{row.total}</td>
              <td className="px-3 py-2 text-right tabular-nums">{Math.round(row.retention * 100)}%</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-1 flex-wrap">
                  {row.last_drill == null && row.last_quiz == null && row.last_schriftlich == null && (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                  {row.last_drill != null && (
                    <span className="rounded bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap">
                      Drill {row.last_drill}%
                    </span>
                  )}
                  {row.last_quiz != null && (
                    <span className="rounded bg-indigo-100 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap">
                      Quiz {row.last_quiz}%
                    </span>
                  )}
                  {row.last_schriftlich != null && (
                    <span className="rounded bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap">
                      Schriftl. {row.last_schriftlich}%
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Heatmap ──
function Heatmap({ heatmap }: { heatmap: { date: string; count: number }[] }) {
  const [showFullYear, setShowFullYear] = useState(false)

  const days = showFullYear ? heatmap : heatmap.slice(-HEATMAP_COMPACT_DAYS)

  const weeks: { date: string; count: number }[][] = []
  const weekLabels: { weekIdx: number; label: string }[] = []
  let week: { date: string; count: number }[] = []
  let lastMonth = -1

  for (let i = 0; i < days.length; i++) {
    const d = new Date(days[i].date + 'T00:00:00')
    const dow = (d.getDay() + 6) % 7

    if (i === 0) {
      for (let p = 0; p < dow; p++) week.push({ date: '', count: -1 })
    }

    week.push(days[i])

    if (dow === 6 || i === days.length - 1) {
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
          Lernaktivität ({showFullYear ? 'letzte 365 Tage' : 'letzte 3 Monate'})
        </p>
        <button
          onClick={() => setShowFullYear((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {showFullYear ? 'Letzte 3 Monate' : 'Ganzes Jahr'}
        </button>
      </div>
      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-x-auto">
        <div className={showFullYear ? 'min-w-[600px]' : 'min-w-0'}>
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

  const fsrsSegments = [
    { label: 'New', value: stats.fsrsVerteilung.new, color: 'hsl(var(--muted-foreground) / 0.4)' },
    { label: 'Learning', value: stats.fsrsVerteilung.learning, color: 'hsl(38 92% 50%)' },
    { label: 'Review', value: stats.fsrsVerteilung.review, color: 'hsl(142 71% 45%)' },
    { label: 'Relearning', value: stats.fsrsVerteilung.relearning, color: 'hsl(0 72% 60%)' },
  ]

  const typSegments = [
    { label: 'Basic', value: stats.typVerteilung.basic, color: 'hsl(var(--primary))' },
    { label: 'Cloze', value: stats.typVerteilung.cloze, color: 'hsl(258 84% 67%)' },
  ]

  const hasPerformanceData =
    stats.performanceTrends.drill.length > 0 ||
    stats.performanceTrends.quiz.length > 0 ||
    stats.performanceTrends.schriftlich.length > 0

  return (
    <div className="max-w-3xl space-y-8 animate-fade-in">
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
            Kein aktiver Streak. Dein Rekord war{' '}
            <span className="font-semibold text-foreground">{stats.bestStreak} Tage</span>. Heute lernen, um wieder anzufangen! 🎯
          </p>
        </div>
      )}

      {/* Heute auf einen Blick */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={<Target className="h-5 w-5 text-primary" />}
          label="Fällig"
          value={stats.dueNow.toLocaleString('de')}
          sub="Karten"
          highlight={stats.dueNow > 0}
        />
        <StatCard
          icon={<Calendar className="h-5 w-5 text-blue-500" />}
          label="Diese Woche"
          value={stats.weekTotal}
          sub="Karten"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
          label="Erinnerungsrate"
          value={`${stats.retentionRate}%`}
          info="Anteil deiner Bewertungen der letzten 12 Monate, bei denen du 'Gut' oder 'Einfach' gewählt hast – statt 'Nochmal' oder 'Schwer'. Zeigt, wie zuverlässig du dir die Karten merkst."
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          label="Aktuelle Serie"
          value={`${stats.streak} Tg`}
          highlight={stats.streak >= 7}
        />
      </div>

      <Tabs defaultValue="uebersicht">
        <TabsList>
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="aktivitaet">Aktivität</TabsTrigger>
          <TabsTrigger value="themen">Themen</TabsTrigger>
        </TabsList>

        {/* Übersicht: Deck-Stats + Verteilungen */}
        <TabsContent value="uebersicht" className="space-y-6 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              icon={<Star className="h-5 w-5 text-amber-500" />}
              label="Karten im Deck"
              value={stats.totalCards.toLocaleString('de')}
            />
            <StatCard
              icon={<Activity className="h-5 w-5 text-violet-500" />}
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
              icon={<Trophy className="h-5 w-5 text-orange-500" />}
              label="Beste Serie"
              value={`${stats.bestStreak} Tg`}
            />
          </div>

          {stats.totalReviews > 0 ? (
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Erinnerungsrate (Karten mit „Gut“ oder „Einfach“ bewertet)</span>
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
                 '🔁 Karten werden zu selten wiederholt, öfter üben hilft!'}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-muted/20 p-8 text-center space-y-2">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-muted">
                <Brain className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-base font-medium mt-4">Noch keine Lernaktivität</p>
              <p className="text-sm text-muted-foreground">Sobald du Karten reviewst, erscheinen hier deine Statistiken.</p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Karten-Verteilung</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DonutCard title="FSRS-Status (Karten im Deck)" segments={fsrsSegments} />
              <DonutCard title="Kartentyp" segments={typSegments} />
            </div>
          </div>
        </TabsContent>

        {/* Aktivität: Heatmap, Forecast, Performance */}
        <TabsContent value="aktivitaet" className="space-y-8 pt-2">
          <Heatmap heatmap={stats.heatmap} />

          <ForecastChart forecast30={stats.forecast30} />

          {hasPerformanceData ? (
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Performance-Trends der letzten Sessions</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Sparkline label="Drill" data={stats.performanceTrends.drill} color="hsl(38 92% 50%)" />
                <Sparkline label="Quiz" data={stats.performanceTrends.quiz} color="hsl(238 84% 67%)" />
                <Sparkline label="Schriftlich" data={stats.performanceTrends.schriftlich} color="hsl(258 84% 67%)" />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border/50 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
              Noch keine Quiz-, Drill- oder Schriftlich-Sessions vorhanden.
            </div>
          )}
        </TabsContent>

        {/* Themen-Breakdown */}
        <TabsContent value="themen" className="pt-2">
          <ThemenBreakdownTable rows={stats.themenBreakdown} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
