'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowLeft, RotateCcw, BookOpen } from 'lucide-react'
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

function htmlAnswer(text: string): string {
  return text
    .replace(/\{\{c\d+::([^}]+)\}\}/g, '<strong class="text-primary">$1</strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-primary">$1</strong>')
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

  // Stable refs for keyboard
  const revealedRef = useRef(false)
  revealedRef.current = revealed
  const handleGewusstRef = useRef<() => void>(() => {})
  const handleNichtGewusstRef = useRef<() => void>(() => {})

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
  const answerHtml = current
    ? (isCloze ? htmlAnswer(current.cloze_text ?? current.antwort) : htmlAnswer(current.antwort))
    : ''

  const answered = totalCards - deck.length
  const progressPct = totalCards > 0 ? (answered / totalCards) * 100 : 0

  async function advance(isReturning: boolean) {
    setExiting(true)
    await new Promise<void>(r => setTimeout(r, 250))
    setExiting(false)

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
    if (!current || actionLoading || exiting) return
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
      if (deck.length === 1) setSessionComplete(true)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleNichtGewusst() {
    if (!current || actionLoading || exiting) return
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground tabular-nums">{answered}</span>
            <span className="text-sm text-muted-foreground">/ {totalCards}</span>
            {/* Circle progress */}
            <svg width="32" height="32" className="-rotate-90">
              <circle cx="16" cy="16" r="13" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
              <circle
                cx="16" cy="16" r="13"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 13}`}
                strokeDashoffset={`${2 * Math.PI * 13 * (1 - progressPct / 100)}`}
                className="transition-all duration-300"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Card + Buttons */}
      <div
        key={cardKey}
        className={`transition-all duration-300 ${exiting ? 'opacity-0 translate-y-1' : 'animate-fade-in'}`}
      >
        <div className="relative bg-card rounded-2xl border border-border/50 shadow-card overflow-hidden flex flex-col min-h-[320px]">
          {current?.image_b64 && (
            <div className="border-b border-border/50 bg-muted/20 px-8 pt-6 pb-4">
              <img
                src={`data:image/jpeg;base64,${current.image_b64}`}
                alt="Folienbild"
                className="w-full max-h-40 object-contain rounded-lg"
              />
            </div>
          )}

          <div className="p-10 flex flex-col flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50 mb-5">
              {isCloze ? 'Lückentext' : 'Frage'}
            </p>

            <div className="flex-1">
              <p className="text-xl font-medium leading-relaxed whitespace-pre-wrap">{questionText}</p>

              {revealed && (
                <div className="mt-6 pt-6 border-t border-border/40 animate-fade-in">
                  <p
                    className="text-lg leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: answerHtml }}
                  />
                  {current?.kontext && (
                    <p className="mt-4 text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-4 leading-relaxed">
                      {current.kontext}
                    </p>
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
            <div className="flex items-center justify-center rounded-xl border border-border/60 bg-muted/40 px-4 text-xs text-muted-foreground font-mono select-none">
              Leertaste
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-5 animate-fade-in">
            <button
              onClick={handleNichtGewusst}
              disabled={actionLoading || exiting}
              className="flex flex-col items-center gap-1 rounded-xl border-2 py-4 px-4 text-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-rose-200 text-rose-600 hover:bg-rose-500 hover:border-rose-500 hover:text-white dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:border-rose-600"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  <span className="text-sm font-semibold leading-none">Nicht gewusst</span>
                  <span className="text-[10px] text-current/60 leading-none mt-0.5">[1]</span>
                </>
              )}
            </button>
            <button
              onClick={handleGewusst}
              disabled={actionLoading || exiting}
              className="flex flex-col items-center gap-1 rounded-xl border-2 py-4 px-4 text-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:border-emerald-600"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  <span className="text-sm font-semibold leading-none">Gewusst</span>
                  <span className="text-[10px] text-current/60 leading-none mt-0.5">[4]</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
