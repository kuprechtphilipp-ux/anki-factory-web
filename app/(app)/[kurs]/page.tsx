'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Brain, Zap, BookOpen, Sparkles, ArrowRight, Plus, PenLine, X, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { FOCUS_NEW_THEMA_EVENT, type KursStatistik, type KursThemaStats, type Thema } from '@/lib/types'

interface Props {
  params: { kurs: string }
}

function DayLabel(dayOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  return d.toLocaleDateString('de-DE', { weekday: 'short' })
}

function RingMetric({ label, value, trackColor, fillColor }: { label: string; value: number; trackColor: string; fillColor: string }) {
  const r = 14
  const circ = 2 * Math.PI * r
  const dash = Math.max(0, Math.min(1, value / 100)) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke={trackColor} strokeWidth="3.5" />
        {value > 0 && (
          <circle
            cx="18" cy="18" r={r} fill="none"
            stroke={fillColor} strokeWidth="3.5"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
          />
        )}
        <text x="18" y="22" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor" className="fill-foreground">
          {value}%
        </text>
      </svg>
      <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground/60 leading-none">{label}</span>
    </div>
  )
}

function ThemaCard({ thema, kursName }: { thema: KursThemaStats; kursName: string }) {
  const total = thema.total
  const enc = encodeURIComponent

  const gelerntPct = total > 0 ? Math.round(thema.gelernt / total * 100) : 0
  const drillPct = thema.last_drill ?? 0
  const quizPct = thema.last_quiz ?? 0

  const borderColor =
    total === 0
      ? 'border-l-border/40'
      : thema.due > 0
      ? 'border-l-primary'
      : thema.neu > 0
      ? 'border-l-amber-400'
      : 'border-l-emerald-500'

  return (
    <div className={`rounded-2xl border border-border/50 bg-card shadow-card border-l-4 ${borderColor} p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/${enc(kursName)}/${enc(thema.name)}`}
          className="font-semibold text-sm hover:text-primary transition-colors leading-tight"
        >
          {thema.name}
        </Link>
        {thema.due > 0 && (
          <span className="shrink-0 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-bold">
            {thema.due} fällig
          </span>
        )}
      </div>

      {total > 0 ? (
        <>
          {/* Ring metrics */}
          <div className="flex items-center justify-around pt-1 pb-0.5">
            <RingMetric label="Gelernt" value={gelerntPct} trackColor="hsl(var(--muted))" fillColor="hsl(var(--primary))" />
            <RingMetric label="Drill" value={drillPct} trackColor="hsl(var(--muted))" fillColor="hsl(38 92% 50%)" />
            <RingMetric label="Quiz" value={quizPct} trackColor="hsl(var(--muted))" fillColor="hsl(238 84% 67%)" />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/${enc(kursName)}/${enc(thema.name)}/lernen`}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors"
            >
              <Brain className="h-3 w-3" />
              Lernen
            </Link>
            <Link
              href={`/${enc(kursName)}/${enc(thema.name)}/drill`}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/10 hover:bg-amber-100/60 dark:hover:bg-amber-950/20 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 transition-colors"
            >
              <Zap className="h-3 w-3" />
              Drill
            </Link>
            <Link
              href={`/${enc(kursName)}/${enc(thema.name)}/quiz`}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card hover:bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="h-3 w-3" />
              Quiz
            </Link>
            <Link
              href={`/${enc(kursName)}/${enc(thema.name)}/schriftlich`}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card hover:bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <PenLine className="h-3 w-3" />
              Schriftlich
            </Link>
            <Link
              href={`/${enc(kursName)}/${enc(thema.name)}`}
              title="Karten generieren"
              className="ml-auto inline-flex items-center justify-center rounded-lg border border-violet-200/50 dark:border-violet-800/30 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 p-1.5 text-violet-600 dark:text-violet-400 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Link>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Noch kein Deck</p>
          <Link
            href={`/${enc(kursName)}/${enc(thema.name)}`}
            className="inline-flex items-center gap-1 rounded-lg border border-violet-200/50 dark:border-violet-800/30 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-400 transition-colors"
          >
            <Sparkles className="h-3 w-3" />
            Karten generieren
          </Link>
        </div>
      )}
    </div>
  )
}

export default function KursDashboard({ params }: Props) {
  const kursName = decodeURIComponent(params.kurs)
  const router = useRouter()

  const [stats, setStats] = useState<KursStatistik | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hintDismissed, setHintDismissed] = useState(true)

  const [showNewThema, setShowNewThema] = useState(false)
  const [newThemaName, setNewThemaName] = useState('')
  const [savingThema, setSavingThema] = useState(false)

  async function handleAddThema() {
    const name = newThemaName.trim()
    if (!name || !stats) return
    setSavingThema(true)
    try {
      const res = await fetch('/api/themen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kurs_id: stats.kurs_id, name }),
      })
      if (!res.ok) { toast.error('Thema konnte nicht angelegt werden'); return }
      const thema = await res.json() as Thema
      router.push(`/${encodeURIComponent(kursName)}/${encodeURIComponent(thema.name)}`)
    } finally {
      setSavingThema(false)
    }
  }

  useEffect(() => {
    setHintDismissed(localStorage.getItem(`cramo:structure-hint-dismissed:${kursName}`) === '1')
  }, [kursName])

  function dismissHint() {
    localStorage.setItem(`cramo:structure-hint-dismissed:${kursName}`, '1')
    setHintDismissed(true)
  }

  useEffect(() => {
    fetch(`/api/kurs-statistik?kurs_name=${encodeURIComponent(kursName)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Kurs nicht gefunden')
        return r.json()
      })
      .then((data: KursStatistik) => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [kursName])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Lade Kurs...</span>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return <div className="py-12 text-destructive text-sm">Kurs &quot;{kursName}&quot; nicht gefunden.</div>
  }

  const maxBar = Math.max(...stats.due_7_tage, 1)
  const totalKartenGesamt = stats.themen.reduce((s, t) => s + t.total + t.neu, 0)

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Kurs</p>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
          <h1 className="text-[1.75rem] font-semibold tracking-tight">{kursName}</h1>
          {stats.themen.length >= 2 && (
            <Link
              href={`/${encodeURIComponent(kursName)}/lernen-gesamt`}
              className="self-start shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card hover:border-primary/30 hover:bg-primary/5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-all shadow-sm"
            >
              <Brain className="h-4 w-4" />
              <span className="sm:hidden">Gesamt-Lernen</span>
              <span className="hidden sm:inline">Quiz aus allen Themen</span>
            </Link>
          )}
        </div>
      </div>

      {/* Combined CTA Hero */}
      {stats.due_heute > 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-primary/5 border border-primary/20 p-5 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Kurs-Session</p>
              <p className="text-2xl font-bold tabular-nums">
                <span className="text-primary">{stats.due_heute}</span> Karten fällig
              </p>
              <p className="text-sm text-muted-foreground">Aus allen Themen dieses Kurses</p>
            </div>
            <Link
              href={`/${encodeURIComponent(kursName)}/lernen-gesamt`}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm"
            >
              <Brain className="h-4 w-4" />
              Alle lernen
            </Link>
          </div>
        </div>
      ) : totalKartenGesamt > 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-950/15 p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
              <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold">Alles im Plan</p>
              <p className="text-sm text-muted-foreground">{totalKartenGesamt} Karten · alle Themen erledigt</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Hinweis: Kursstruktur vor Generierung anlegen */}
      {stats.themen.length === 1 && !hintDismissed && (
        <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-muted/40 p-4 text-sm text-muted-foreground">
          <Lightbulb className="h-4 w-4 text-muted-foreground/60 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p>
              <span className="font-medium text-foreground">Tipp:</span> Lege am Anfang gleich alle Themen/Kapitel
              dieses Kurses an (z. B. aus dem Inhaltsverzeichnis), auch wenn sie noch keine Karten enthalten. Cramo nutzt beim Generieren die
              Liste deiner Themen, um besser einzuschätzen, was schon abgedeckt ist und wie viele Karten sinnvoll sind.
              Neue Themen legst du über das „+“ neben dem Kurs in der <span className="font-semibold text-foreground">Sidebar</span> an.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent(FOCUS_NEW_THEMA_EVENT, { detail: { kursId: stats.kurs_id } }))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card hover:bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors"
            >
              <Plus className="h-3 w-3" />
              Thema anlegen
            </button>
          </div>
          <button
            onClick={dismissHint}
            className="shrink-0 rounded-md p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Hinweis schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Thema Health Grid */}
      {stats.themen.length > 0 ? (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Themen</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.themen.map((thema) => (
              <ThemaCard key={thema.id} thema={thema} kursName={kursName} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Noch keine Themen angelegt</p>
            <p className="text-sm text-muted-foreground mt-1">
              Lege dein erstes Thema an. Danach kannst du direkt ein PDF hochladen und Karten generieren.
            </p>
          </div>
          {showNewThema ? (
            <div className="mx-auto flex max-w-xs gap-1.5">
              <Input
                autoFocus
                placeholder="Themaname, z. B. Kapitel 1"
                value={newThemaName}
                onChange={(e) => setNewThemaName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddThema() }}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                className="h-8 px-2.5"
                onClick={handleAddThema}
                disabled={savingThema || !newThemaName.trim()}
              >
                {savingThema ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowNewThema(true)}>
              <Plus className="h-3.5 w-3.5" />
              Thema anlegen
            </Button>
          )}
        </div>
      )}

      {/* Upcoming Reviews Chart */}
      {stats.total_karten > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Fälligkeiten der nächsten 7 Tage</p>
          <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-card">
            <div className="flex items-end gap-2 h-24">
              {stats.due_7_tage.map((count, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${Math.max(4, (count / maxBar) * 72)}px`,
                      background: count > 0
                        ? (i === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.4)')
                        : 'hsl(var(--muted))',
                    }}
                    title={`${count} Karten`}
                  />
                  <span className="text-[9px] font-medium text-muted-foreground/60 leading-none">{DayLabel(i)}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground/50">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary inline-block" />Heute</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary/40 inline-block" />Folgetage</span>
            </div>
          </div>
        </div>
      )}

      {/* Generate CTA — nur bei genau einem Thema eindeutig, sonst hat jede ThemaCard ihren eigenen Link */}
      {stats.themen.length === 1 && (
        <button
          onClick={() => {
            window.location.href = `/${encodeURIComponent(kursName)}/${encodeURIComponent(stats.themen[0].name)}`
          }}
          className="group relative w-full overflow-hidden rounded-2xl border border-violet-200/50 dark:border-violet-800/30 p-4 text-left transition-all hover:border-violet-300/70 hover:shadow-md"
          style={{ background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(243 75% 59% / 0.04) 50%, hsl(var(--card)) 100%)' }}
        >
          <div
            className="animate-shimmer absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
            style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(243 75% 59% / 0.06) 50%, transparent 100%)' }}
          />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 shrink-0">
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400 group-hover:animate-spin" style={{ animationDuration: '2s' }} />
              </div>
              <div>
                <p className="text-sm font-semibold">Neues Material generieren</p>
                <p className="text-xs text-muted-foreground">PDF → Flashcards in Sekunden</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </button>
      )}
    </div>
  )
}
