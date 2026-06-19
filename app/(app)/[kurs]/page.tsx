'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Brain, Zap, BookOpen, Sparkles, ArrowRight, Plus, PenLine, X, Lightbulb, FileText, Upload, Trash2, Layers, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { FOCUS_NEW_THEMA_EVENT, type KursStatistik, type KursThemaStats, type KursAltklausur, type Thema } from '@/lib/types'

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

  const [kontextOpen, setKontextOpen] = useState(false)
  const [faelligkeitenOpen, setFaelligkeitenOpen] = useState(false)
  const [altklausuren, setAltklausuren] = useState<KursAltklausur[]>([])
  const [altklausurenLoading, setAltklausurenLoading] = useState(false)
  const [uploadingAltklausur, setUploadingAltklausur] = useState(false)
  const altklausurInputRef = useRef<HTMLInputElement>(null)
  const [kursNotiz, setKursNotiz] = useState('')
  const kursNotizSavedRef = useRef('')
  const [notizSaving, setNotizSaving] = useState(false)
  const [notizHintOpen, setNotizHintOpen] = useState(false)

  async function loadAltklausuren(kursId: number) {
    setAltklausurenLoading(true)
    try {
      const res = await fetch(`/api/kurs-altklausuren?kurs_id=${kursId}`)
      if (!res.ok) return
      setAltklausuren(await res.json())
    } finally {
      setAltklausurenLoading(false)
    }
  }

  async function handleAltklausurUpload(file: File) {
    if (!stats) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Altklausur zu groß (max. 10 MB).')
      return
    }
    setUploadingAltklausur(true)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('kurs_id', String(stats.kurs_id))
      const res = await fetch('/api/kurs-altklausuren', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error ?? 'Altklausur konnte nicht hochgeladen werden')
        return
      }
      const neu = await res.json() as KursAltklausur
      setAltklausuren((prev) => [...prev, neu])
      toast.success('Altklausur hinzugefügt')
    } finally {
      setUploadingAltklausur(false)
      if (altklausurInputRef.current) altklausurInputRef.current.value = ''
    }
  }

  async function handleAltklausurDelete(id: number) {
    setAltklausuren((prev) => prev.filter((a) => a.id !== id))
    const res = await fetch(`/api/kurs-altklausuren/${id}`, { method: 'DELETE' })
    if (!res.ok) toast.error('Altklausur konnte nicht gelöscht werden')
  }

  async function saveKursNotiz() {
    if (!stats || kursNotiz === kursNotizSavedRef.current) return
    setNotizSaving(true)
    try {
      const res = await fetch(`/api/kurse/${stats.kurs_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notiz_kontext: kursNotiz.trim() || null }),
      })
      if (res.ok) {
        kursNotizSavedRef.current = kursNotiz
      } else {
        toast.error('Hinweis konnte nicht gespeichert werden')
      }
    } finally {
      setNotizSaving(false)
    }
  }

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
        kursNotizSavedRef.current = data.notiz_kontext ?? ''
        setKursNotiz(data.notiz_kontext ?? '')
        loadAltklausuren(data.kurs_id)
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
    <div className="max-w-3xl lg:max-w-4xl xl:max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-[10px] lg:text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Kurs</p>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
          <h1 className="text-[1.75rem] lg:text-3xl xl:text-4xl font-semibold tracking-tight">{kursName}</h1>
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
        <div className="relative overflow-hidden rounded-2xl bg-primary/5 border border-primary/20 p-5 lg:p-6 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] lg:text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Kurs-Session</p>
              <p className="text-2xl lg:text-3xl font-bold tabular-nums">
                <span className="text-primary">{stats.due_heute}</span> Karten fällig
              </p>
              <p className="text-sm lg:text-base text-muted-foreground">Aus allen Themen dieses Kurses</p>
            </div>
            <Link
              href={`/${encodeURIComponent(kursName)}/lernen-gesamt`}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 text-sm lg:text-base font-semibold transition-colors shadow-sm"
            >
              <Brain className="h-4 w-4" />
              Alle lernen
            </Link>
          </div>
        </div>
      ) : totalKartenGesamt > 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-950/15 p-5 lg:p-6 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
              <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold lg:text-lg">Alles im Plan</p>
              <p className="text-sm lg:text-base text-muted-foreground">{totalKartenGesamt} Karten · alle Themen erledigt</p>
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
          <p className="text-[10px] lg:text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Themen</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
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

      {/* Kontext für KI-Generierung: Themen-Struktur + Altklausuren, kursweit */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <button
          onClick={() => setKontextOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Kontext für KI-Generierung</p>
              <p className="text-xs text-muted-foreground truncate">
                {stats.themen.length} {stats.themen.length === 1 ? 'Thema' : 'Themen'}
                {altklausuren.length > 0 ? ` · ${altklausuren.length} Altklausur${altklausuren.length > 1 ? 'en' : ''}` : ''}
                {kursNotiz.trim() ? ' · Hinweis hinterlegt' : ''}
              </p>
            </div>
          </div>
          {kontextOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </button>
        {kontextOpen && (
          <div className="px-4 pb-4 pt-1 space-y-4 animate-fade-in">
            {/* Themen-Struktur */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Themen-Struktur</p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent(FOCUS_NEW_THEMA_EVENT, { detail: { kursId: stats.kurs_id } }))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card hover:bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <Plus className="h-3 w-3" />
                  Thema anlegen
                </button>
              </div>
              {stats.themen.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {stats.themen.map((t) => (
                    <span key={t.id} className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium">{t.name}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Noch keine Themen angelegt.</p>
              )}
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Hilft Cramo beim Generieren, die Themenabdeckung einzuschätzen.
              </p>
            </div>

            <div className="h-px bg-border/50" />

            {/* Altklausuren / Prüfungen */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Altklausuren / Prüfungen</p>
                <button
                  onClick={() => altklausurInputRef.current?.click()}
                  disabled={uploadingAltklausur}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200/60 dark:border-violet-800/40 bg-card hover:bg-violet-50 dark:hover:bg-violet-950/20 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-300 transition-colors disabled:opacity-50 shrink-0"
                >
                  {uploadingAltklausur ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Hochladen (PDF)
                </button>
              </div>
              {altklausurenLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : altklausuren.length > 0 ? (
                <div className="space-y-1.5">
                  {altklausuren.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-violet-200/60 dark:border-violet-800/40 bg-card px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                        <span className="text-xs font-medium truncate">{a.dateiname}</span>
                      </div>
                      <button
                        onClick={() => handleAltklausurDelete(a.id)}
                        className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        title="Entfernen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Dient als Stil-/Format-Referenz für Generieren, Quiz &amp; Schriftlich – ersetzt aber nicht die Themenabdeckung.
              </p>
              <input
                ref={altklausurInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleAltklausurUpload(f)
                }}
              />
            </div>

            <div className="h-px bg-border/50" />

            {/* Hinweise für die KI */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Hinweise für die KI</p>
                <button
                  type="button"
                  onClick={() => setNotizHintOpen((v) => !v)}
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground/60 hover:text-foreground transition-colors"
                  title="Wofür ist das?"
                >
                  <Info className="h-3 w-3" />
                </button>
              </div>
              {notizHintOpen && (
                <div className="space-y-1 rounded-lg border border-violet-200/60 dark:border-violet-800/40 bg-card px-3 py-2 text-xs text-muted-foreground leading-snug">
                  <p>Beispiele:</p>
                  <p>· „Formeln muss ich nicht auswendig können, nur die Schritte in Excel anwenden.“</p>
                  <p>· „Gesetzestexte liegen in der Prüfung als Open-Book-Material vor, dafür keine Cloze-Karten.“</p>
                </div>
              )}
              <Textarea
                value={kursNotiz}
                onChange={(e) => setKursNotiz(e.target.value)}
                onBlur={saveKursNotiz}
                placeholder='z.B. "Formeln muss ich nicht auswendig können, nur die Schritte in Excel anwenden"'
                className="min-h-[36px] text-sm bg-card"
              />
              {notizSaving && <p className="text-[11px] text-muted-foreground">Speichert…</p>}
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Optional. Fließt in Pre-Scan &amp; Generierung in allen Themen dieses Kurses ein.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Reviews Chart */}
      {stats.total_karten > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card/50 shadow-card overflow-hidden">
          <button
            onClick={() => setFaelligkeitenOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-5 py-3 text-left"
            aria-expanded={faelligkeitenOpen}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Fälligkeiten der nächsten 7 Tage</span>
            {faelligkeitenOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {faelligkeitenOpen && (
            <div className="px-5 pb-5 space-y-3 border-t border-border/50 pt-4 animate-fade-in">
              <p className="text-xs text-muted-foreground leading-relaxed">
                So viele Karten werden an den nächsten Tagen zur Wiederholung fällig — hilft dir abzuschätzen, wann mehr Lernzeit sinnvoll ist.
              </p>
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
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary inline-block" />Heute</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary/40 inline-block" />Folgetage</span>
              </div>
            </div>
          )}
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
