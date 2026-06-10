'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, BookOpen, RotateCcw } from 'lucide-react'
import type { QuizFrage } from '@/lib/types'

type QuizState = 'idle' | 'generating' | 'playing' | 'done'

interface AnswerRecord {
  selected: number
  correct: boolean
}

const ANZAHL_OPTIONS = [5, 10, 15, 20]

export default function QuizPage({ params }: { params: { kurs: string; thema: string } }) {
  const kursName = decodeURIComponent(params.kurs)
  const themaName = decodeURIComponent(params.thema)
  const backHref = `/${encodeURIComponent(kursName)}/${encodeURIComponent(themaName)}`

  const [themaId, setThemaId] = useState<number | null>(null)
  const [reviewedCount, setReviewedCount] = useState<number | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(true)

  const [quizState, setQuizState] = useState<QuizState>('idle')
  const [fragen, setFragen] = useState<QuizFrage[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [revealed, setRevealed] = useState(false)
  const [anzahl, setAnzahl] = useState(10)
  const [schwierigkeit, setSchwierigkeit] = useState<'leicht' | 'mittel' | 'schwer'>('mittel')
  const [genError, setGenError] = useState<string | null>(null)

  useEffect(() => {
    async function loadMeta() {
      const { data: kursRow } = await supabase.from('kurs').select('id').eq('name', kursName).single()
      if (!kursRow) { setLoadingMeta(false); return }
      const { data: themaRow } = await supabase.from('thema').select('id').eq('kurs_id', kursRow.id).eq('name', themaName).single()
      if (!themaRow) { setLoadingMeta(false); return }
      setThemaId(themaRow.id)
      const res = await fetch(`/api/karten?thema_id=${themaRow.id}&status=reviewed`)
      const data = await res.json()
      setReviewedCount(Array.isArray(data) ? data.length : 0)
      setLoadingMeta(false)
    }
    loadMeta()
  }, [kursName, themaName])

  async function handleGenerate() {
    if (!themaId) return
    setQuizState('generating')
    setGenError(null)
    try {
      const res = await fetch('/api/quiz-generieren', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thema_id: themaId, anzahl, schwierigkeit }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setGenError(data.message ?? data.error ?? 'Generierung fehlgeschlagen')
        setQuizState('idle')
        return
      }
      setFragen(data.fragen)
      setCurrentIdx(0)
      setAnswers([])
      setRevealed(false)
      setQuizState('playing')
    } catch {
      setGenError('Netzwerkfehler')
      setQuizState('idle')
    }
  }

  function handleAnswer(optionIdx: number) {
    if (revealed) return
    const isCorrect = optionIdx === fragen[currentIdx].richtig
    setAnswers((prev) => [...prev, { selected: optionIdx, correct: isCorrect }])
    setRevealed(true)
  }

  function handleWeiter() {
    if (currentIdx < fragen.length - 1) {
      setCurrentIdx((i) => i + 1)
      setRevealed(false)
    } else {
      const finalCorrect = answers.filter((a) => a.correct).length
      const finalPct = answers.length > 0 ? Math.round((finalCorrect / answers.length) * 100) : 0
      if (themaId) {
        fetch('/api/session-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thema_id: themaId, mode: 'quiz', score_pct: finalPct, correct: finalCorrect, total: answers.length }),
        })
      }
      setQuizState('done')
    }
  }

  function handleNochmalAlle() {
    setCurrentIdx(0)
    setAnswers([])
    setRevealed(false)
    setQuizState('playing')
  }

  function handleNochmalFalsche() {
    const falseFragen = fragen.filter((_, idx) => answers[idx]?.correct === false)
    if (falseFragen.length === 0) return
    setFragen(falseFragen)
    setCurrentIdx(0)
    setAnswers([])
    setRevealed(false)
    setQuizState('playing')
  }

  const correctCount = answers.filter((a) => a.correct).length
  const totalCount = answers.length
  const scorePct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
  const falscheCount = answers.filter((a) => !a.correct).length

  const scoreColor =
    scorePct >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
    scorePct >= 60 ? 'text-violet-600 dark:text-violet-400' :
    'text-amber-600 dark:text-amber-400'

  const scoreLabel =
    scorePct >= 80 ? 'Ausgezeichnet!' :
    scorePct >= 60 ? 'Gut gemacht!' :
    'Mehr Übung empfohlen'

  const scoreBarColor =
    scorePct >= 80 ? 'bg-emerald-500' :
    scorePct >= 60 ? 'bg-violet-500' :
    'bg-amber-500'

  // ── Loading meta ──
  if (loadingMeta) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }

  // ── Generating ──
  if (quizState === 'generating') {
    return (
      <div className="max-w-xl mx-auto pt-16 text-center space-y-6">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-900/30">
          <Loader2 className="h-7 w-7 animate-spin text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <p className="text-lg font-semibold">Quiz wird generiert</p>
          <p className="text-sm text-muted-foreground mt-1">
            Claude analysiert deine Karten und erstellt Prüfungsfragen...
          </p>
        </div>
        <div className="h-1 w-48 mx-auto rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-violet-400 animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    )
  }

  // ── Done ──
  if (quizState === 'done') {
    return (
      <div className="max-w-md mx-auto pt-12 space-y-8">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />{themaName}
        </Link>

        <div className="text-center space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Quiz abgeschlossen</p>
          <p className={`text-5xl font-bold tabular-nums ${scoreColor}`}>{scorePct}%</p>
          <p className={`text-base font-semibold ${scoreColor}`}>{scoreLabel}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{correctCount}</span> von {totalCount} richtig
          </p>
        </div>

        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${scoreBarColor}`}
            style={{ width: `${scorePct}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleNochmalAlle}>
            <RotateCcw className="h-4 w-4" />
            Nochmal (alle)
          </Button>
          {falscheCount > 0 && (
            <Button variant="outline" className="flex-1 gap-2 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/20" onClick={handleNochmalFalsche}>
              <RotateCcw className="h-4 w-4" />
              Nochmal ({falscheCount} falsche)
            </Button>
          )}
          <Button asChild className="flex-1 gap-2" variant="default">
            <Link href={backHref}>
              <BookOpen className="h-4 w-4" />
              Zurück
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // ── Playing ──
  if (quizState === 'playing' && fragen.length > 0) {
    const frage = fragen[currentIdx]
    const currentAnswer = answers[currentIdx]
    const progressPct = Math.round(((currentIdx + (revealed ? 1 : 0)) / fragen.length) * 100)

    return (
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <Link href={backHref} className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{themaName}</span>
          </Link>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {currentIdx + 1} / {fragen.length}
          </span>
        </div>

        {/* Question card */}
        <div className="rounded-2xl border border-border/50 bg-card shadow-card p-6 sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-4">Frage</p>
          <p className="text-lg font-medium leading-relaxed">{frage.frage}</p>
        </div>

        {/* Answer options */}
        <div className="space-y-2.5">
          {frage.optionen.map((option, idx) => {
            let cls = 'border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 cursor-pointer'
            if (revealed) {
              if (idx === frage.richtig) {
                cls = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 cursor-default'
              } else if (idx === currentAnswer?.selected && !currentAnswer.correct) {
                cls = 'border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 line-through opacity-70 cursor-default'
              } else {
                cls = 'border-border/40 bg-muted/30 text-muted-foreground/60 cursor-default'
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={revealed}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-150 text-sm font-medium leading-relaxed ${cls}`}
              >
                {option}
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {revealed && frage.erklaerung && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 animate-fade-in">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 mb-1">Erklärung</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{frage.erklaerung}</p>
          </div>
        )}

        {/* Weiter button */}
        {revealed && (
          <div className="animate-fade-in">
            <Button
              onClick={handleWeiter}
              className="w-full h-11 shadow-sm"
            >
              {currentIdx < fragen.length - 1 ? 'Weiter' : 'Auswertung ansehen'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ── Idle ──
  return (
    <div className="max-w-lg space-y-7">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5">
          <ArrowLeft className="h-3.5 w-3.5" />{themaName}
        </Link>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">{kursName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Quiz</h1>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          Teste dein Wissen mit KI-generierten Multiple-Choice-Fragen aus deinen eigenen Karten.
        </p>
      </div>

      {reviewedCount != null && reviewedCount < 4 && (
        <div className="rounded-xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-3">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Mindestens 4 Karten im Deck nötig</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
            Aktuell {reviewedCount ?? 0} Karte{reviewedCount !== 1 ? 'n' : ''} im Deck.
          </p>
        </div>
      )}

      {genError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{genError}</p>
        </div>
      )}

      <div className="space-y-3 p-5 rounded-2xl bg-card border border-border/50 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Anzahl Fragen</p>
        <div className="flex gap-2">
          {ANZAHL_OPTIONS.map((n) => (
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
        <p className="text-[11px] text-muted-foreground">
          Aus {reviewedCount ?? '…'} verfügbaren Karten
        </p>
      </div>

      <div className="space-y-3 p-5 rounded-2xl bg-card border border-border/50 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Schwierigkeit</p>
        <div className="flex gap-2">
          {(['leicht', 'mittel', 'schwer'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSchwierigkeit(s)}
              className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all capitalize ${
                schwierigkeit === s
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {schwierigkeit === 'leicht' && 'Klar unterscheidbare Optionen'}
          {schwierigkeit === 'mittel' && 'Plausible Distraktoren'}
          {schwierigkeit === 'schwer' && 'Subtile Unterschiede, Missverständnisse'}
        </p>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={(reviewedCount ?? 0) < 4}
        className="w-full h-11 gap-2 shadow-sm"
      >
        Quiz generieren
      </Button>
    </div>
  )
}
