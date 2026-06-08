'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { LernCard } from '@/components/lern-card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, ArrowLeft, BookOpen, RotateCcw, Sparkles } from 'lucide-react'
import type { Karte } from '@/lib/types'

interface Props {
  params: { kurs: string; thema: string }
}

export default function LernenPage({ params }: Props) {
  const kursName = decodeURIComponent(params.kurs)
  const themaName = decodeURIComponent(params.thema)

  const [themaId, setThemaId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [karten, setKarten] = useState<Karte[]>([])
  const [idx, setIdx] = useState(0)
  const [done, setDone] = useState(0)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [nextDue, setNextDue] = useState<string | null>(null)
  const [sessionComplete, setSessionComplete] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: kursRow } = await supabase
        .from('kurs').select('id').eq('name', kursName).single()
      if (!kursRow) { setLoading(false); return }

      const { data: themaRow } = await supabase
        .from('thema').select('id').eq('kurs_id', kursRow.id).eq('name', themaName).single()
      if (!themaRow) { setLoading(false); return }

      setThemaId(themaRow.id)
      const res = await fetch(`/api/karten?thema_id=${themaRow.id}&status=reviewed&due=true`)
      const data: Karte[] = await res.json()
      setKarten(data)

      if (data.length === 0) {
        const nextRes = await fetch(`/api/karten?thema_id=${themaRow.id}&status=reviewed`)
        const allReviewed: Karte[] = await nextRes.json()
        if (allReviewed.length > 0) {
          const earliest = allReviewed.map((k) => k.fsrs_due).sort()[0]
          setNextDue(earliest)
        }
      }
      setLoading(false)
    }
    init()
  }, [kursName, themaName])

  async function handleRate(rating: 1 | 2 | 3 | 4) {
    const karte = karten[idx]
    setRatingLoading(true)
    try {
      await fetch(`/api/karte/${karte.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      })
      const newDone = done + 1
      setDone(newDone)
      const nextIdx = idx + 1
      if (nextIdx >= karten.length) {
        setSessionComplete(true)
      } else {
        setIdx(nextIdx)
      }
    } finally {
      setRatingLoading(false)
    }
  }

  const backHref = `/${encodeURIComponent(kursName)}/${encodeURIComponent(themaName)}`

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
    return (
      <div className="py-12 text-destructive text-sm">
        Thema &quot;{themaName}&quot; wurde nicht gefunden.
      </div>
    )
  }

  // ── Keine fälligen Karten ──
  if (karten.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="mb-8">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {themaName}
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center max-w-sm mx-auto space-y-5">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Alles erledigt!</h2>
            <p className="text-muted-foreground leading-relaxed">
              Keine Karten fällig. Du hast alle Karten für heute gelernt.
            </p>
          </div>
          {nextDue && (
            <div className="rounded-xl bg-muted/60 border border-border/50 px-5 py-3 text-sm">
              <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Nächste Wiederholung</p>
              <p className="font-medium text-foreground">
                {new Date(nextDue).toLocaleDateString('de-DE', {
                  weekday: 'long', day: 'numeric', month: 'long',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          )}
          {nextDue == null && (
            <p className="text-sm text-muted-foreground text-center">
              Noch keine reviewed Karten vorhanden.
            </p>
          )}
          <Button asChild variant="outline" className="gap-2">
            <Link href={backHref}>
              <BookOpen className="h-4 w-4" />
              Zurück zum Thema
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // ── Session abgeschlossen ──
  if (sessionComplete) {
    return (
      <div className="flex flex-col h-full">
        <div className="mb-8">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {themaName}
          </Link>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center max-w-sm mx-auto space-y-5">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Session abgeschlossen!</h2>
            <p className="text-muted-foreground leading-relaxed">
              Du hast{' '}
              <span className="font-semibold text-foreground">{done}</span>{' '}
              {done === 1 ? 'Karte' : 'Karten'} für heute gelernt.
            </p>
          </div>
          <div className="flex gap-2.5 pt-1">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setIdx(0)
                setDone(0)
                setSessionComplete(false)
                setLoading(true)
                fetch(`/api/karten?thema_id=${themaId}&status=reviewed&due=true`)
                  .then((r) => r.json())
                  .then((data: Karte[]) => { setKarten(data); setLoading(false) })
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Nochmal
            </Button>
            <Button asChild className="gap-2">
              <Link href={backHref}>
                <BookOpen className="h-4 w-4" />
                Zum Thema
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Lern-Modus ──
  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {themaName}
        </Link>
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{kursName}</span>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1">
        <LernCard
          karte={karten[idx]}
          current={idx + 1}
          total={karten.length}
          onRate={handleRate}
          loading={ratingLoading}
        />
      </div>
    </div>
  )
}
