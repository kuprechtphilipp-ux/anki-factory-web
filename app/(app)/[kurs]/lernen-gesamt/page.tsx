'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { FSRS, generatorParameters } from 'ts-fsrs'
import { karteToFsrsCard } from '@/lib/fsrs'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, BookOpen, Layers, Flame, Target } from 'lucide-react'
import { ExpandableImage } from '@/components/expandable-image'
import { isTypingInField } from '@/lib/utils'
import type { Karte, FsrsState, Thema } from '@/lib/types'

const clientFsrs = new FSRS(generatorParameters())

function fmtDays(days: number): string {
  const mins = days * 1440
  if (mins < 1) return '< 1 Min'
  if (mins < 60) return `${Math.round(mins)} Min`
  const hrs = days * 24
  if (hrs < 24) return `${Math.round(hrs)} Std`
  if (days < 7) return `${Math.round(days)} Tg`
  if (days < 30) return `${Math.round(days / 7)} Wo`
  return `${Math.round(days / 30)} Mo`
}

function computeIntervals(karte: Karte): Record<1 | 2 | 3 | 4, string> {
  const s = karte.fsrs_state as FsrsState
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sc = clientFsrs.repeat(karteToFsrsCard(karte), new Date()) as any
  if (s === 0 || s === 1) {
    return { 1: '< 1 Min', 2: '< 6 Min', 3: '< 10 Min', 4: fmtDays(sc[4].card.scheduled_days) }
  }
  return {
    1: '< 10 Min',
    2: fmtDays(sc[2].card.scheduled_days),
    3: fmtDays(sc[3].card.scheduled_days),
    4: fmtDays(sc[4].card.scheduled_days),
  }
}

function maskCloze(text: string): string {
  return text.replace(/\{\{c\d+::([^}]+)\}\}/g, '[...]')
}

function htmlAnswer(text: string): string {
  return text
    .replace(/\{\{c\d+::([^}]+)\}\}/g, '<strong class="text-primary">$1</strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-primary">$1</strong>')
}

function formatRelative(isoDate: string): string {
  const diffMs = new Date(isoDate).getTime() - Date.now()
  if (diffMs <= 0) return 'jetzt'
  const mins = Math.ceil(diffMs / 60_000)
  if (mins < 60) return `in ${mins} Min.`
  const hrs = Math.ceil(diffMs / 3_600_000)
  if (hrs < 24) return `in ${hrs} Std.`
  return `in ${Math.ceil(diffMs / 86_400_000)} Tg.`
}

interface QueueItem {
  karte: Karte
  source: 'learning' | 'review' | 'new'
}

interface SrsData {
  learning: Karte[]
  reviews: Karte[]
  neue: Karte[]
  total: number
}

const RATINGS = [
  { r: 1 as const, label: 'Nochmal', border: 'border-rose-200 text-rose-600 dark:border-rose-800 dark:text-rose-400', hover: 'hover:bg-rose-500 hover:border-rose-500 hover:text-white dark:hover:bg-rose-600 dark:hover:border-rose-600' },
  { r: 2 as const, label: 'Schwer', border: 'border-amber-200 text-amber-600 dark:border-amber-800 dark:text-amber-400', hover: 'hover:bg-amber-500 hover:border-amber-500 hover:text-white dark:hover:bg-amber-600 dark:hover:border-amber-600' },
  { r: 3 as const, label: 'Gut', border: 'border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400', hover: 'hover:bg-blue-500 hover:border-blue-500 hover:text-white dark:hover:bg-blue-600 dark:hover:border-blue-600' },
  { r: 4 as const, label: 'Einfach', border: 'border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400', hover: 'hover:bg-emerald-500 hover:border-emerald-500 hover:text-white dark:hover:bg-emerald-600 dark:hover:border-emerald-600' },
]

export default function LernenGesamtPage({ params }: { params: { kurs: string } }) {
  const kursName = decodeURIComponent(params.kurs)
  const backHref = `/${encodeURIComponent(kursName)}`

  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  const [themaMap, setThemaMap] = useState<Record<number, string>>({})

  const [queue, setQueue] = useState<QueueItem[]>([])
  const [priorityFilter, setPriorityFilter] = useState<'alle' | 'core' | 'fokus'>('alle')
  const [totalInitialMap, setTotalInitialMap] = useState<Record<string, number>>({ alle: 0, core: 0, fokus: 0 })
  const [cardKey, setCardKey] = useState(0)
  const [exiting, setExiting] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [returningCard, setReturningCard] = useState(false)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  const cardRef = useRef<HTMLDivElement>(null)
  const [swipeOverlay, setSwipeOverlay] = useState<{ color: 'green' | 'red'; opacity: number } | null>(null)
  const swipeExitRef = useRef(false)

  const sessionStartRef = useRef(Date.now())
  const [donePermanent, setDonePermanent] = useState(0)
  const [newLearned, setNewLearned] = useState(0)
  const [reviewsDone, setReviewsDone] = useState(0)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [nextDue, setNextDue] = useState<string | null>(null)

  const revealedRef = useRef(false)
  revealedRef.current = revealed
  const handleRateRef = useRef<(r: 1 | 2 | 3 | 4) => void>(() => {})

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const swipingRef = useRef(false)

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: kursRow } = await supabase.from('kurs').select('id').eq('name', kursName).single()
      if (!kursRow) { setLoading(false); setInitialized(true); return }

      const { data: themenData } = await supabase.from('thema').select('*').eq('kurs_id', kursRow.id)
      const themen = (themenData ?? []) as Thema[]
      const map: Record<number, string> = {}
      for (const t of themen) map[t.id] = t.name
      setThemaMap(map)

      const res = await fetch(`/api/karten?kurs_name=${encodeURIComponent(kursName)}&mode=srs`)
      const data: SrsData = await res.json()

      const q: QueueItem[] = [
        ...data.learning.map((k) => ({ karte: k, source: 'learning' as const })),
        ...data.reviews.map((k) => ({ karte: k, source: 'review' as const })),
        ...data.neue.map((k) => ({ karte: k, source: 'new' as const })),
      ]
      setQueue(q)
      setTotalInitialMap({
        alle: q.length,
        core: q.filter((i) => i.karte.tags?.includes('core')).length,
        fokus: q.filter((i) => i.karte.tags?.includes('fokus')).length,
      })

      if (q.length === 0) {
        const allRes = await fetch(`/api/karten?kurs_name=${encodeURIComponent(kursName)}&status=reviewed`)
        const all: Karte[] = await allRes.json()
        const future = all
          .filter((k) => new Date(k.fsrs_due) > new Date())
          .sort((a, b) => new Date(a.fsrs_due).getTime() - new Date(b.fsrs_due).getTime())
        if (future.length > 0) setNextDue(future[0].fsrs_due)
      }

      setLoading(false)
      setInitialized(true)
    }
    init()
  }, [kursName])

  const filteredQueue = queue.filter((item) => {
    if (priorityFilter === 'alle') return true
    if (priorityFilter === 'fokus') return item.karte.tags?.includes('fokus')
    if (priorityFilter === 'core') return item.karte.tags?.includes('core')
    return true
  })

  const totalInitial = totalInitialMap[priorityFilter]

  useEffect(() => {
    if (initialized && !loading && totalInitial > 0 && filteredQueue.length === 0 && !sessionComplete) {
      setSessionComplete(true)
    }
  }, [initialized, loading, totalInitial, filteredQueue.length, sessionComplete])

  const currentItem = filteredQueue[0]
  const currentKarte = currentItem?.karte

  const intervals = currentKarte ? computeIntervals(currentKarte) : null
  const isCloze = currentKarte?.typ === 'cloze'
  const questionText = currentKarte
    ? isCloze ? maskCloze(currentKarte.cloze_text ?? currentKarte.frage) : currentKarte.frage
    : ''
  const answerHtml = currentKarte
    ? isCloze ? htmlAnswer(currentKarte.cloze_text ?? currentKarte.antwort) : htmlAnswer(currentKarte.antwort)
    : ''

  const learningCount = filteredQueue.filter((i) => i.karte.fsrs_state === 1 || i.karte.fsrs_state === 3).length
  const reviewsCount = filteredQueue.filter((i) => i.karte.fsrs_state === 2).length
  const neueCount = filteredQueue.filter((i) => i.karte.fsrs_state === 0).length
  const progressPct = totalInitial > 0 ? (donePermanent / totalInitial) * 100 : 0

  async function handleRate(rating: 1 | 2 | 3 | 4) {
    if (!currentKarte || !currentItem || ratingLoading || (exiting && !swipeExitRef.current)) return
    setRatingLoading(true)
    try {
      const res = await fetch(`/api/karte/${currentKarte.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, mode: 'srs' }),
      })
      const { updated } = (await res.json()) as { updated: Karte }

      const isReturning =
        updated.fsrs_state === 1 ||
        updated.fsrs_state === 3 ||
        (updated.fsrs_state === 2 && new Date(updated.fsrs_due) <= new Date(Date.now() + 3_600_000))

      const wasNew = currentKarte.fsrs_state === 0
      const wasReview = currentKarte.fsrs_state === 2 || currentKarte.fsrs_state === 3
      const src = currentItem.source
      const wasSwipe = swipeExitRef.current
      swipeExitRef.current = false

      if (isReturning) setReturningCard(true)

      if (!wasSwipe) {
        setExiting(true)
        await new Promise<void>((r) => setTimeout(r, isReturning ? 650 : 280))
        setReturningCard(false)
        setExiting(false)
      } else {
        await new Promise<void>((r) => setTimeout(r, 30))
        setReturningCard(false)
        setExiting(false)
      }

      if (isReturning) {
        setQueue((prev) => {
          const rest = prev.filter((i) => i.karte.id !== currentKarte.id)
          return [...rest, { karte: updated, source: src }]
        })
      } else {
        setQueue((prev) => prev.filter((i) => i.karte.id !== currentKarte.id))
        setDonePermanent((p) => p + 1)
        if (wasNew && updated.fsrs_state >= 2) setNewLearned((p) => p + 1)
        if (wasReview) setReviewsDone((p) => p + 1)
      }

      setRevealed(false)
      setCardKey((k) => k + 1)
    } finally {
      setRatingLoading(false)
    }
  }

  handleRateRef.current = handleRate

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    swipingRef.current = false
    if (cardRef.current) cardRef.current.style.transition = 'none'
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touchStartX.current || !touchStartY.current || !revealedRef.current) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (!swipingRef.current && Math.abs(dy) > Math.abs(dx)) return
    swipingRef.current = true
    if (cardRef.current) cardRef.current.style.transform = `translateX(${dx}px) rotate(${dx * 0.04}deg)`
    const opacity = Math.min(0.75, Math.abs(dx) / 80)
    setSwipeOverlay(opacity > 0.04 ? { color: dx > 0 ? 'green' : 'red', opacity } : null)
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null

    if (!revealedRef.current) {
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.25s ease-out'
        cardRef.current.style.transform = ''
      }
      setSwipeOverlay(null)
      if (!swipingRef.current || dy < -30 || Math.abs(dx) > 30) setRevealed(true)
      swipingRef.current = false
      return
    }

    const isHardSwipe = swipingRef.current && Math.abs(dx) >= 80 && Math.abs(dy) < 120
    swipingRef.current = false

    if (isHardSwipe) {
      if (cardRef.current) {
        cardRef.current.style.transition = 'transform 0.28s ease-out, opacity 0.28s ease-out'
        cardRef.current.style.transform = dx > 0 ? 'translateX(150vw) rotate(25deg)' : 'translateX(-150vw) rotate(-25deg)'
        cardRef.current.style.opacity = '0'
      }
      setExiting(true)
      swipeExitRef.current = true
      const rating: 1 | 3 = dx > 0 ? 3 : 1
      setTimeout(() => { setSwipeOverlay(null); handleRateRef.current(rating) }, 270)
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
      else if (revealedRef.current && e.key === '1') handleRateRef.current(1)
      else if (revealedRef.current && e.key === '2') handleRateRef.current(2)
      else if (revealedRef.current && e.key === '3') handleRateRef.current(3)
      else if (revealedRef.current && e.key === '4') handleRateRef.current(4)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const minutesLearned = Math.max(1, Math.floor((Date.now() - sessionStartRef.current) / 60_000))

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

  if (initialized && totalInitial === 0) {
    return (
      <div className="flex flex-col h-full max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />{kursName}
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center max-w-sm mx-auto space-y-5">
          <h2 className="text-2xl font-semibold tracking-tight">Alles erledigt</h2>
          <p className="text-muted-foreground leading-relaxed">Keine Karten aus diesem Kurs fällig für heute.</p>
          {nextDue && (
            <div className="rounded-xl bg-muted/60 border border-border/50 px-5 py-3 text-sm">
              <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Nächste Wiederholung</p>
              <p className="font-medium">{new Date(nextDue).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}
          <Button asChild variant="outline" className="gap-2">
            <Link href={backHref}><BookOpen className="h-4 w-4" />Zurück zum Kurs</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (sessionComplete) {
    return (
      <div className="flex flex-col h-full max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />{kursName}
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center max-w-sm mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">Alle Karten erledigt</h2>
            <p className="text-sm text-muted-foreground">Kurs-Session abgeschlossen.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full">
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4">
              <p className="text-2xl font-bold text-primary">{newLearned}</p>
              <p className="text-xs text-muted-foreground mt-1">neu gelernt</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4">
              <p className="text-2xl font-bold text-emerald-600">{reviewsDone}</p>
              <p className="text-xs text-muted-foreground mt-1">Reviews</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border/50 p-4">
              <p className="text-2xl font-bold text-foreground">{minutesLearned}</p>
              <p className="text-xs text-muted-foreground mt-1">Min. gelernt</p>
            </div>
          </div>
          {nextDue && (
            <p className="text-sm text-muted-foreground">
              Nächste Karte <span className="font-semibold text-foreground">{formatRelative(nextDue)}</span>
            </p>
          )}
          <Button asChild variant="outline" className="gap-2">
            <Link href={backHref}><BookOpen className="h-4 w-4" />Zurück zum Kurs</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col max-w-2xl mx-auto">
      {/* Back + progress */}
      <div className="flex items-center gap-3 mb-7">
        <Link href={backHref} className="shrink-0 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{kursName}</span>
        </Link>
        <div className="flex-1 h-0.5 bg-muted/30 rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Priority filter */}
      <div className="flex items-center justify-center p-1 rounded-xl max-w-[320px] mx-auto mb-7 bg-background/60 dark:bg-muted/30 backdrop-blur-md border border-border/40 shadow-sm relative z-20">
        {([
          { val: 'alle' as const, icon: <Layers className="h-3.5 w-3.5" />, label: 'Alle', cls: 'bg-primary/10 text-primary border-primary/10' },
          { val: 'core' as const, icon: <Flame className="h-3.5 w-3.5" />, label: 'Core', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/10' },
          { val: 'fokus' as const, icon: <Target className="h-3.5 w-3.5 animate-pulse" />, label: 'Fokus', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10' },
        ]).map(({ val, icon, label, cls }) => (
          <button
            key={val}
            onClick={() => setPriorityFilter(val)}
            className={`flex items-center justify-center gap-1.5 flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-200 ${
              priorityFilter === val
                ? `${cls} border shadow-sm font-semibold scale-105`
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Pills */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {learningCount > 0 && <span className="rounded-full px-3 py-1 text-xs font-semibold bg-primary/10 text-primary">{learningCount} Lernen</span>}
        {reviewsCount > 0 && <span className="rounded-full px-3 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{reviewsCount} Reviews</span>}
        {neueCount > 0 && <span className="rounded-full px-3 py-1 text-xs font-semibold bg-muted text-muted-foreground">{neueCount} Neu</span>}
      </div>

      {/* Card */}
      <div
        key={cardKey}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`transition-opacity duration-200 touch-pan-y select-none ${exiting ? 'opacity-0' : 'animate-fade-in'}`}
      >
        <div ref={cardRef} className="relative bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden flex flex-col min-h-[300px] sm:min-h-[320px]">
          {swipeOverlay && revealed && (
            <div
              className={`absolute inset-0 rounded-2xl pointer-events-none z-10 flex items-center justify-center gap-2 ${swipeOverlay.color === 'green' ? 'bg-blue-500' : 'bg-rose-500'}`}
              style={{ opacity: swipeOverlay.opacity }}
            >
              <span className="text-white font-bold text-xl">{swipeOverlay.color === 'green' ? '👍 Gut' : '↩ Nochmal'}</span>
            </div>
          )}

          <div className="p-5 sm:p-10 flex flex-col flex-1">
            {returningCard && (
              <div className="absolute top-4 right-4 rounded-full px-2.5 py-1 text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 animate-pulse">
                Kommt zurück
              </div>
            )}

            <div className="flex items-center justify-between gap-2 mb-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
                {isCloze ? 'Lückentext' : 'Frage'}
              </p>
              <div className="flex items-center gap-1.5">
                {/* Thema badge */}
                {currentKarte && themaMap[currentKarte.thema_id] && (
                  <span className="rounded-full bg-muted/60 text-muted-foreground/70 border border-border/40 px-2 py-0.5 text-[9px] font-medium">
                    {themaMap[currentKarte.thema_id]}
                  </span>
                )}
                {currentKarte?.tags?.includes('fokus') ? (
                  <span className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50 px-2 py-0.5 text-[9px] font-bold">🎯 Fokus</span>
                ) : currentKarte?.tags?.includes('core') ? (
                  <span className="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50 px-2 py-0.5 text-[9px] font-bold">Core</span>
                ) : null}
              </div>
            </div>

            <div className="flex-1">
              <p className="text-xl font-medium leading-relaxed whitespace-pre-wrap">{questionText}</p>
              {revealed && (
                <div className="mt-6 pt-6 border-t border-border/40 animate-fade-in">
                  <p className="text-lg leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: answerHtml }} />
                  {currentKarte?.kontext && (
                    <p className="mt-4 text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-4 leading-relaxed">
                      {currentKarte.kontext}
                    </p>
                  )}
                  {currentKarte?.image_b64 && (
                    <ExpandableImage
                      src={`data:image/jpeg;base64,${currentKarte.image_b64}`}
                      alt="Folienbild"
                      className="mt-4 w-full max-h-48 object-contain rounded-lg border border-border/50"
                    />
                  )}
                </div>
              )}
            </div>

            {currentKarte?.slide_nr && (
              <p className="text-xs text-muted-foreground/40 text-right mt-4">Folie {currentKarte.slide_nr}</p>
            )}
          </div>
        </div>

        {!revealed ? (
          <div className="flex items-stretch gap-3 mt-5">
            <Button className="flex-1 h-12 text-base shadow-sm rounded-xl" onClick={() => setRevealed(true)} disabled={ratingLoading}>
              Antwort zeigen
            </Button>
            <div className="hidden sm:flex items-center justify-center rounded-xl border border-border/60 bg-muted/40 px-4 text-xs text-muted-foreground font-mono select-none">
              Leertaste
            </div>
          </div>
        ) : (
          <div className="mt-5 animate-fade-in space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {RATINGS.map(({ r, label, border, hover }) => (
                <button
                  key={r}
                  onClick={() => handleRate(r)}
                  disabled={ratingLoading || exiting}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3.5 px-1 sm:px-2 text-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[60px] ${border} ${hover}`}
                >
                  <span className="text-[10px] text-muted-foreground/60 leading-none">{intervals?.[r] ?? '—'}</span>
                  {ratingLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                    <>
                      <span className="text-sm font-semibold leading-none">{label}</span>
                      <span className="hidden sm:block text-[10px] text-muted-foreground/40 leading-none">[{r}]</span>
                    </>
                  )}
                </button>
              ))}
            </div>
            <div className="text-center text-[11px] text-muted-foreground/40">
              {isTouchDevice ? (
                <p>← wischen = Nochmal &nbsp;·&nbsp; Gut = wischen →</p>
              ) : (
                <p className="flex items-center justify-center gap-1 text-[10px]">
                  Tipp: <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 text-[9px] font-mono font-semibold shadow-sm">Leertaste</kbd> aufdecken ·
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 text-[9px] font-mono font-semibold shadow-sm">1</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 text-[9px] font-mono font-semibold shadow-sm">2</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 text-[9px] font-mono font-semibold shadow-sm">3</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/80 text-[9px] font-mono font-semibold shadow-sm">4</kbd> bewerten
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
