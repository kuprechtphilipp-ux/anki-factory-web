'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, RotateCcw, BookOpen, Check, X } from 'lucide-react'
import { ExpandableImage } from '@/components/expandable-image'
import { KarteMarkdown } from '@/components/karte-markdown'
import { useCramoContext } from '@/components/cramo-context'
import { isTypingInField } from '@/lib/utils'
import type { Karte } from '@/lib/types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function maskCloze(text: string): string {
  return text.replace(/\{\{c\d+::([^}]+)\}\}/g, '[...]')
}

function unmaskCloze(text: string): string {
  const parts = text.split(/((?:\$\$[\s\S]*?\$\$|\$[^$\n]+?\$))/g)
  return parts.map((part, i) => {
    const isMath = i % 2 === 1
    return part.replace(
      /\{\{c\d+::([^}]+)\}\}/g,
      (_, answer: string) => isMath ? answer : `**${answer}**`
    )
  }).join('')
}

export default function DrillPage({ params }: { params: { kurs: string; thema: string } }) {
  const kursName = decodeURIComponent(params.kurs)
  const themaName = decodeURIComponent(params.thema)

  const [loading, setLoading] = useState(true)
  const [themaId, setThemaId] = useState<number | null>(null)

  const [deck, setDeck] = useState<Karte[]>([])
  const [totalCards, setTotalCards] = useState(0)
  const [correctOnFirst, setCorrectOnFirst] = useState(0)
  const [wrongIds, setWrongIds] = useState<Set<number>>(new Set())
  const [wrongCards, setWrongCards] = useState<Karte[]>([])

  const [cardKey, setCardKey] = useState(0)
  const [exiting, setExiting] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)

  // Swipe animation state
  const cardRef = useRef<HTMLDivElement>(null)
  const [swipeOverlay, setSwipeOverlay] = useState<{ color: 'green' | 'red'; opacity: number } | null>(null)
  const swipeExitRef = useRef(false)

  // Stable refs
  const revealedRef = useRef(false)
  revealedRef.current = revealed
  const handleGewusstRef = useRef<() => void>(() => {})
  const handleNichtGewusstRef = useRef<() => void>(() => {})

  // Touch tracking
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const swipingRef = useRef(false)

  useEffect(() => {
    async function init() {
      const { data: kursRow } = await supabase.from('kurs').select('id').eq('name', kursName).single()
      if (!kursRow) { setLoading(false); return }
      const { data: themaRow } = await supabase.from('thema').select('id').eq('kurs_id', kursRow.id).eq('name', themaName).single()
      if (!themaRow) { setLoading(false); return }
      setThemaId(themaRow.id)

      const res = await fetch(`/api/karten?thema_id=${themaRow.id}&mode=drill`)
      const data: Karte[] = await res.json()
      const shuffled = shuffle(data)
      setDeck(shuffled)
      setTotalCards(shuffled.length)
      setLoading(false)
    }
    init()
  }, [kursName, themaName])

  const current = deck[0]
  const isCloze = current?.typ === 'cloze'
  const questionText = current
    ? (isCloze ? maskCloze(current.cloze_text ?? current.frage) : current.frage)
    : ''
  const answerText = current
    ? (isCloze ? unmaskCloze(current.cloze_text ?? current.antwort) : current.antwort)
    : ''

  const answered = totalCards - deck.length
  const progressPct = totalCards > 0 ? (answered / totalCards) * 100 : 0

  const { setContext, clearContext } = useCramoContext()
  useEffect(() => {
    if (!current) return
    setContext({
      kursName,
      themaName,
      karteFrage: current.typ === 'cloze' ? (current.cloze_text ?? current.frage) : current.frage,
      karteAntwort: current.typ === 'cloze' ? undefined : current.antwort,
      karteKontext: current.kontext ?? undefined,
    })
  }, [current, kursName, themaName, setContext])
  useEffect(() => () => clearContext(), [clearContext])

  async function advance(isReturning: boolean) {
    const wasSwipe = swipeExitRef.current
    swipeExitRef.current = false

    if (!wasSwipe) {
      setExiting(true)
      await new Promise<void>(r => setTimeout(r, 250))
      setExiting(false)
    } else {
      await new Promise<void>(r => setTimeout(r, 30))
      setExiting(false)
    }

    if (isReturning) {
      setDeck(prev => {
        const [first, ...rest] = prev
        return [...rest, first]
      })
    } else {
      setDeck(prev => prev.slice(1))
    }

    setRevealed(false)
    setCardKey(k => k + 1)
  }

  async function handleGewusst() {
    if (!current || actionLoading || (exiting && !swipeExitRef.current)) return
    setActionLoading(true)
    try {
      if (!wrongIds.has(current.id)) {
        setCorrectOnFirst(p => p + 1)
      }
      await fetch(`/api/karte/${current.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 4, mode: 'drill' }),
      })
      await advance(false)
      if (deck.length === 1) {
        const finalCorrect = !wrongIds.has(current.id) ? correctOnFirst + 1 : correctOnFirst
        const finalPct = totalCards > 0 ? Math.round((finalCorrect / totalCards) * 100) : 0
        if (themaId) {
          fetch('/api/session-results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thema_id: themaId, mode: 'drill', score_pct: finalPct, correct: finalCorrect, total: totalCards }),
          })
        }
        setSessionComplete(true)
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleNichtGewusst() {
    if (!current || actionLoading || (exiting && !swipeExitRef.current)) return
    setActionLoading(true)
    try {
      if (!wrongIds.has(current.id)) {
        setWrongIds(prev => { const s = new Set(prev); s.add(current.id); return s })
        setWrongCards(prev => [...prev, current])
      }
      await fetch(`/api/karte/${current.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 1, mode: 'drill' }),
      })
      await advance(true)
    } finally {
      setActionLoading(false)
    }
  }

  handleGewusstRef.current = handleGewusst
  handleNichtGewusstRef.current = handleNichtGewusst

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    swipingRef.current = false
    if (cardRef.current) {
      cardRef.current.style.transition = 'none'
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touchStartX.current || !touchStartY.current) return
    if (!revealedRef.current) return

    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current

    if (!swipingRef.current && Math.abs(dy) > Math.abs(dx)) return
    swipingRef.current = true

    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`
    }

    const opacity = Math.min(0.75, Math.abs(dx) / 80)
    setSwipeOverlay(opacity > 0.04 ? { color: dx > 0 ? 'green' : 'red', opacity } : null)
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current)
    touchStartX.current = null
    touchStartY.current = null

    if (!revealedRef.current) {
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.25s ease-out'
        cardRef.current.style.transform = ''
      }
      setSwipeOverlay(null)
      if (!swipingRef.current) setRevealed(true)
      swipingRef.current = false
      return
    }

    const isHardSwipe = swipingRef.current && Math.abs(dx) >= 80 && dy < 120
    swipingRef.current = false

    if (isHardSwipe) {
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.28s ease-out, opacity 0.28s ease-out'
        cardRef.current.style.transform = dx > 0
          ? 'translateX(150vw) rotate(30deg)'
          : 'translateX(-150vw) rotate(-30deg)'
        cardRef.current.style.opacity = '0'
      }
      setExiting(true)
      swipeExitRef.current = true
      setTimeout(() => {
        setSwipeOverlay(null)
        if (dx > 0) handleGewusstRef.current()
        else handleNichtGewusstRef.current()
      }, 270)
    } else {
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)'
        cardRef.current.style.transform = ''
      }
      setSwipeOverlay(null)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingInField(e.target)) return
      if (e.key === ' ' && !revealedRef.current) { e.preventDefault(); setRevealed(true) }
      else if (revealedRef.current && e.key === '1') handleNichtGewusstRef.current()
      else if (revealedRef.current && e.key === '4') handleGewusstRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const backHref = `/${encodeURIComponent(kursName)}/${encodeURIComponent(themaName)}`

  function restartWrong() {
    const cards = shuffle(wrongCards)
    setDeck(cards)
    setTotalCards(cards.length)
    setCorrectOnFirst(0)
    setWrongIds(new Set())
    setWrongCards([])
    setSessionComplete(false)
    setCardKey(k => k + 1)
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Lade Karten...</span>
        </div>
      </div>
    )
  }

  if (!themaId) {
    return <div className="py-12 text-destructive text-sm">Thema &quot;{themaName}&quot; nicht gefunden.</div>
  }

  if (totalCards === 0) {
    return (
      <div className="flex flex-col h-full max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />{themaName}
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">Keine Karten verfügbar</h2>
          <p className="text-sm text-muted-foreground">Überprüfe zuerst einige Karten im Review-Tab.</p>
          <Button asChild variant="outline" className="gap-2">
            <Link href={backHref}><BookOpen className="h-4 w-4" />Zurück zum Thema</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ── Session complete ──
  if (sessionComplete) {
    const score = correctOnFirst
    const pct = totalCards > 0 ? Math.round((score / totalCards) * 100) : 0
    return (
      <div className="flex flex-col h-full max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />{themaName}
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center max-w-sm mx-auto space-y-6">
          <div>
            <p className="text-6xl font-bold text-primary mb-2">{pct}%</p>
            <p className="text-xl font-semibold tracking-tight">
              {score} / {totalCards} gewusst
            </p>
            <p className="text-sm text-muted-foreground mt-2">beim ersten Versuch</p>
          </div>
          <div className="flex gap-3 pt-2">
            {wrongCards.length > 0 && (
              <Button variant="outline" onClick={restartWrong} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Nochmal ({wrongCards.length} falsche)
              </Button>
            )}
            <Button asChild variant={wrongCards.length > 0 ? 'outline' : 'default'} className="gap-2">
              <Link href={backHref}><BookOpen className="h-4 w-4" />Fertig</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Active drill ──
  return (
    <div className="flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />{themaName}
        </Link>
        <div className="flex items-center gap-3">
          {wrongIds.size > 0 && (
            <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
              {wrongIds.size} zum Wiederholen
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground tabular-nums">
              {answered}<span className="text-muted-foreground font-normal mx-0.5">/</span>{totalCards}
            </span>
            <svg width="28" height="28" className="-rotate-90 shrink-0">
              <circle cx="14" cy="14" r="11" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
              <circle
                cx="14" cy="14" r="11"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 11}`}
                strokeDashoffset={`${2 * Math.PI * 11 * (1 - progressPct / 100)}`}
                className="transition-all duration-300"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Card + Buttons */}
      <div
        key={cardKey}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`transition-opacity duration-200 touch-pan-y select-none ${exiting ? 'opacity-0' : 'animate-fade-in'}`}
      >
        {/* Card — ref for imperative swipe transforms */}
        <div
          ref={cardRef}
          className="relative bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden flex flex-col min-h-[300px] sm:min-h-[320px]"
        >
          {/* Swipe overlay */}
          {swipeOverlay && (
            <div
              className={`absolute inset-0 rounded-2xl pointer-events-none z-10 flex items-center justify-center gap-2 ${
                swipeOverlay.color === 'green' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ opacity: swipeOverlay.opacity }}
            >
              {swipeOverlay.color === 'green' ? (
                <>
                  <Check className="h-8 w-8 text-white" strokeWidth={3} />
                  <span className="text-white font-bold text-xl">Gewusst</span>
                </>
              ) : (
                <>
                  <X className="h-8 w-8 text-white" strokeWidth={3} />
                  <span className="text-white font-bold text-xl">Nicht gewusst</span>
                </>
              )}
            </div>
          )}

          <div className="p-5 sm:p-10 flex flex-col flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 mb-5">
              {isCloze ? 'Lückentext' : 'Frage'}
            </p>

            <div className="flex-1">
              <KarteMarkdown content={questionText} className="text-xl font-medium leading-relaxed whitespace-pre-wrap" />

              {revealed && (
                <div className="mt-6 pt-6 border-t border-border/40 animate-fade-in">
                  <KarteMarkdown content={answerText} className="text-lg leading-relaxed whitespace-pre-wrap [&_strong]:text-primary" />
                  {current?.kontext && (
                    <div className="mt-4 text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-4 leading-relaxed">
                      <KarteMarkdown content={current.kontext} />
                    </div>
                  )}
                  {current?.image_b64 && (
                    <ExpandableImage
                      src={`data:image/jpeg;base64,${current.image_b64}`}
                      alt="Folienbild"
                      className="mt-4 w-full max-h-48 object-contain rounded-lg border border-border/50"
                    />
                  )}
                </div>
              )}
            </div>

            {current?.slide_nr && (
              <p className="text-xs text-muted-foreground/40 text-right mt-4">Folie {current.slide_nr}</p>
            )}
          </div>
        </div>

        {!revealed ? (
          <div className="flex items-stretch gap-3 mt-5">
            <Button
              className="flex-1 h-12 text-base shadow-sm rounded-xl"
              onClick={() => setRevealed(true)}
              disabled={actionLoading}
            >
              Antwort zeigen
            </Button>
            <div className="hidden sm:flex items-center justify-center rounded-xl border border-border/60 bg-muted/40 px-4 text-xs text-muted-foreground font-mono select-none">
              Leertaste
            </div>
          </div>
        ) : (
          <div className="mt-5 animate-fade-in space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleNichtGewusst}
                disabled={actionLoading || exiting}
                className="flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 px-4 text-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-rose-200 text-rose-600 hover:bg-rose-500 hover:border-rose-500 hover:text-white dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:border-rose-600 min-h-[60px]"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <span className="text-base font-semibold leading-none">Nicht gewusst</span>
                    <span className="hidden sm:block text-[10px] text-current/60 leading-none">[1]</span>
                  </>
                )}
              </button>
              <button
                onClick={handleGewusst}
                disabled={actionLoading || exiting}
                className="flex flex-col items-center gap-1.5 rounded-xl border-2 py-4 px-4 text-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:border-emerald-600 min-h-[60px]"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <span className="text-base font-semibold leading-none">Gewusst</span>
                    <span className="hidden sm:block text-[10px] text-current/60 leading-none">[4]</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground/50">
              ← wischen = Nicht gewusst &nbsp;·&nbsp; Gewusst = wischen →
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
