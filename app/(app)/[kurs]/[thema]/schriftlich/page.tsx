'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeft, PenLine, CheckCircle2, XCircle, RotateCcw, Coins } from 'lucide-react'
import type { Karte } from '@/lib/types'
import { estimateSchriftlichCredits } from '@/lib/quiz-cost'

const ANZAHL_OPTIONS = [5, 10, 15, 20]

interface CardResult {
  karte: Karte
  userAnswer: string
  score: number
  feedback: string
  korrekt: boolean
}

function getClozeDisplay(clozeText: string) {
  return clozeText.replace(/\{\{c\d+::([^}]+)\}\}/g, '[...]')
}

function getClozeAnswer(clozeText: string) {
  const matches = clozeText.matchAll(/\{\{c\d+::([^}]+)\}\}/g)
  return Array.from(matches).map(m => m[1]).join('; ')
}

export default function SchriftlichPage({ params }: { params: { kurs: string; thema: string } }) {
  const kursName = decodeURIComponent(params.kurs)
  const themaName = decodeURIComponent(params.thema)
  const backHref = `/${encodeURIComponent(kursName)}/${encodeURIComponent(themaName)}`

  const [themaId, setThemaId] = useState<number | null>(null)
  const [allKarten, setAllKarten] = useState<Karte[]>([])
  const [sessionKarten, setSessionKarten] = useState<Karte[]>([])
  const [pageState, setPageState] = useState<'loading' | 'idle' | 'playing' | 'done'>('loading')
  const [anzahl, setAnzahl] = useState(10)

  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [checking, setChecking] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<{ score: number; feedback: string; korrekt: boolean } | null>(null)
  const [results, setResults] = useState<CardResult[]>([])
  const [creditsUsed, setCreditsUsed] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function load() {
      const { data: kursRow } = await supabase.from('kurs').select('id').eq('name', kursName).single()
      if (!kursRow) { setPageState('idle'); return }
      const { data: themaRow } = await supabase.from('thema').select('id').eq('kurs_id', kursRow.id).eq('name', themaName).single()
      if (!themaRow) { setPageState('idle'); return }
      setThemaId(themaRow.id)
      const res = await fetch(`/api/karten?thema_id=${themaRow.id}&status=reviewed`)
      const data = await res.json()
      setAllKarten(Array.isArray(data) ? data : [])
      setPageState('idle')
    }
    load()
  }, [kursName, themaName])

  function startSession() {
    const shuffled = [...allKarten].sort(() => Math.random() - 0.5).slice(0, Math.min(anzahl, allKarten.length))
    setSessionKarten(shuffled)
    setCurrentIdx(0)
    setUserAnswer('')
    setSubmitted(false)
    setAiFeedback(null)
    setResults([])
    setCreditsUsed(0)
    setPageState('playing')
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  async function handleSubmit() {
    if (!userAnswer.trim() || submitted) return
    const karte = sessionKarten[currentIdx]
    setSubmitted(true)
    setChecking(true)

    const frage = karte.typ === 'cloze' ? getClozeDisplay(karte.cloze_text ?? '') : karte.frage
    const musterantwort = karte.typ === 'cloze' ? getClozeAnswer(karte.cloze_text ?? '') : karte.antwort

    fetch('/api/antwort-pruefen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frage, musterantwort, nutzerantwort: userAnswer, kontext: karte.kontext }),
    })
      .then(async r => {
        const data = await r.json()
        if (r.status === 402) {
          toast.error(data.message ?? data.error)
          setChecking(false)
          return
        }
        setAiFeedback(data)
        setCreditsUsed((prev) => prev + (data.credits ?? 0))
        setChecking(false)
      })
      .catch(() => setChecking(false))
  }

  async function handleRate(gewusst: boolean) {
    const karte = sessionKarten[currentIdx]
    await fetch(`/api/karte/${karte.id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: gewusst ? 4 : 1 }),
    }).catch(() => {})

    const result: CardResult = {
      karte,
      userAnswer,
      score: aiFeedback?.score ?? (gewusst ? 80 : 20),
      feedback: aiFeedback?.feedback ?? '',
      korrekt: gewusst,
    }
    const newResults = [...results, result]
    setResults(newResults)

    if (currentIdx < sessionKarten.length - 1) {
      setCurrentIdx(i => i + 1)
      setUserAnswer('')
      setSubmitted(false)
      setAiFeedback(null)
      setTimeout(() => textareaRef.current?.focus(), 100)
    } else {
      const finalCorrect = newResults.filter(r => r.korrekt).length
      const finalPct = newResults.length > 0 ? Math.round((finalCorrect / newResults.length) * 100) : 0
      if (themaId) {
        fetch('/api/session-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thema_id: themaId, mode: 'schriftlich', score_pct: finalPct, correct: finalCorrect, total: newResults.length }),
        })
      }
      setPageState('done')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !submitted) {
      handleSubmit()
    }
  }

  const correctCount = results.filter(r => r.korrekt).length
  const scorePct = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0
  const avgScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0

  const scoreColor = scorePct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : scorePct >= 60 ? 'text-violet-600 dark:text-violet-400' : 'text-amber-600 dark:text-amber-400'
  const scoreBarColor = scorePct >= 80 ? 'bg-emerald-500' : scorePct >= 60 ? 'bg-violet-500' : 'bg-amber-500'

  if (pageState === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }

  if (pageState === 'done') {
    return (
      <div className="max-w-md mx-auto pt-12 space-y-8">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />{themaName}
        </Link>

        <div className="text-center space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Schriftlich abgeschlossen</p>
          <p className={`text-5xl font-bold tabular-nums ${scoreColor}`}>{correctCount} / {results.length}</p>
          <p className={`text-base font-semibold ${scoreColor}`}>
            {scorePct >= 80 ? 'Ausgezeichnet!' : scorePct >= 60 ? 'Gut gemacht!' : 'Mehr Übung empfohlen'}
          </p>
          <p className="text-sm text-muted-foreground">KI-Score: <span className="font-semibold text-foreground">{avgScore}%</span> Durchschnitt</p>
          <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1">
            <Coins className="h-3.5 w-3.5" />
            {creditsUsed} Credit{creditsUsed === 1 ? '' : 's'} verbraucht
          </p>
        </div>

        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${scoreBarColor}`} style={{ width: `${scorePct}%` }} />
        </div>

        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-xl border p-3 ${r.korrekt ? 'border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/10' : 'border-rose-200/60 dark:border-rose-800/40 bg-rose-50/60 dark:bg-rose-950/10'}`}>
              {r.korrekt
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                : <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-xs font-medium text-foreground/80 truncate">
                  {r.karte.typ === 'cloze' ? getClozeDisplay(r.karte.cloze_text ?? '') : r.karte.frage}
                </p>
                {r.feedback && <p className="text-xs text-muted-foreground">{r.feedback}</p>}
              </div>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{r.score}%</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={startSession}>
            <RotateCcw className="h-4 w-4" />
            Nochmal
          </Button>
          <Button asChild className="flex-1" variant="default">
            <Link href={backHref}>Zurück</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (pageState === 'playing' && sessionKarten.length > 0) {
    const karte = sessionKarten[currentIdx]
    const frage = karte.typ === 'cloze' ? getClozeDisplay(karte.cloze_text ?? '') : karte.frage
    const musterantwort = karte.typ === 'cloze' ? getClozeAnswer(karte.cloze_text ?? '') : karte.antwort
    const progressPct = Math.round((currentIdx / sessionKarten.length) * 100)

    return (
      <div className="max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={backHref} className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{themaName}</span>
          </Link>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{currentIdx + 1} / {sessionKarten.length}</span>
        </div>

        {/* Question */}
        <div className="rounded-2xl border border-border/50 bg-card shadow-card p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">
            {karte.typ === 'cloze' ? 'Lückentext' : 'Frage'}
          </p>
          <p className="text-lg font-medium leading-relaxed">{frage}</p>
          {karte.kontext && (
            <p className="mt-3 text-xs text-muted-foreground border-l-2 border-border/60 pl-3">{karte.kontext}</p>
          )}
        </div>

        {/* Input */}
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={submitted}
            placeholder="Deine Antwort..."
            className="min-h-[100px] resize-none text-sm"
          />
          <p className="text-[10px] text-muted-foreground/50">⌘↵ zum Abschicken</p>
        </div>

        {!submitted && (
          <Button onClick={handleSubmit} disabled={!userAnswer.trim()} className="w-full h-11 shadow-sm">
            Antwort prüfen
          </Button>
        )}

        {/* Reveal */}
        {submitted && (
          <div className="space-y-3 animate-fade-in">
            <div className="rounded-xl border border-border/50 bg-muted/30 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2">Musterantwort</p>
              <p className="text-sm font-medium leading-relaxed text-foreground">{musterantwort}</p>
            </div>

            {/* AI Feedback */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 min-h-[56px] flex items-start gap-3">
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary mt-0.5 shrink-0" />
              ) : aiFeedback ? (
                <>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">KI-Bewertung</p>
                      <span className={`text-xs font-bold tabular-nums ${aiFeedback.score >= 80 ? 'text-emerald-600' : aiFeedback.score >= 60 ? 'text-violet-600' : 'text-amber-600'}`}>
                        {aiFeedback.score}%
                      </span>
                    </div>
                    {aiFeedback.feedback && <p className="text-sm text-foreground/80 leading-relaxed">{aiFeedback.feedback}</p>}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">KI-Bewertung nicht verfügbar</p>
              )}
            </div>

            {/* Self-rate */}
            <div className="flex gap-2.5 animate-fade-in">
              <button
                onClick={() => handleRate(false)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/40 py-3 text-sm font-semibold text-rose-700 dark:text-rose-400 transition-all"
              >
                <XCircle className="h-4 w-4" />
                Nicht gewusst
              </button>
              <button
                onClick={() => handleRate(true)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                Gewusst
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Idle
  return (
    <div className="max-w-lg space-y-7">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
          <ArrowLeft className="h-3.5 w-3.5" />{themaName}
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">{kursName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Schriftlich</h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Schreibe deine Antwort selbst — KI bewertet und gibt Feedback. Du entscheidest, ob du es als gewusst zählst.
        </p>
      </div>

      {allKarten.length < 2 && (
        <div className="rounded-xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-3">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Mindestens 2 Karten im Deck nötig</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">Aktuell {allKarten.length} Karte{allKarten.length !== 1 ? 'n' : ''} im Deck.</p>
        </div>
      )}

      <div className="space-y-3 p-5 rounded-2xl bg-card border border-border/50 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Anzahl Karten</p>
        <div className="flex gap-2">
          {ANZAHL_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => setAnzahl(n)}
              className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${
                anzahl === n
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Aus {allKarten.length} verfügbaren Karten</p>
        <p className="text-[11px] font-medium text-muted-foreground/80">
          ≈ {estimateSchriftlichCredits(anzahl)} Credit{estimateSchriftlichCredits(anzahl) === 1 ? '' : 's'}
        </p>
      </div>

      <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 flex items-start gap-3">
        <PenLine className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-foreground">Wie es funktioniert</p>
          <p className="text-xs text-muted-foreground leading-relaxed">Du siehst die Frage, tippst deine Antwort, siehst dann die Musterantwort und KI-Feedback — dann bewertest du selbst mit Gewusst / Nicht gewusst. Gewusste Karten aktualisieren deinen Lernstand.</p>
        </div>
      </div>

      <Button
        onClick={startSession}
        disabled={allKarten.length < 2}
        className="w-full h-11 gap-2 shadow-sm"
      >
        <PenLine className="h-4 w-4" />
        Schriftlich starten
      </Button>
    </div>
  )
}
