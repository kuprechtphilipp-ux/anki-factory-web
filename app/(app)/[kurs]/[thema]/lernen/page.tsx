'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { LernCard } from '@/components/lern-card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, ArrowLeft, BookOpen } from 'lucide-react'
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
        .from('kurs')
        .select('id')
        .eq('name', kursName)
        .single()
      if (!kursRow) { setLoading(false); return }

      const { data: themaRow } = await supabase
        .from('thema')
        .select('id')
        .eq('kurs_id', kursRow.id)
        .eq('name', themaName)
        .single()
      if (!themaRow) { setLoading(false); return }

      setThemaId(themaRow.id)

      const res = await fetch(
        `/api/karten?thema_id=${themaRow.id}&status=reviewed&due=true`
      )
      const data: Karte[] = await res.json()
      setKarten(data)

      if (data.length === 0) {
        const nextRes = await fetch(
          `/api/karten?thema_id=${themaRow.id}&status=reviewed`
        )
        const allReviewed: Karte[] = await nextRes.json()
        if (allReviewed.length > 0) {
          const earliest = allReviewed
            .map((k) => k.fsrs_due)
            .sort()[0]
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Lade Karten...</span>
      </div>
    )
  }

  if (!themaId) {
    return (
      <div className="text-destructive py-12">
        Thema &quot;{themaName}&quot; wurde nicht gefunden.
      </div>
    )
  }

  const backHref = `/${encodeURIComponent(kursName)}/${encodeURIComponent(themaName)}`

  // ── Keine fälligen Karten ──
  if (karten.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            {themaName}
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 max-w-sm mx-auto">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
          <h2 className="text-2xl font-bold">Alles erledigt!</h2>
          <p className="text-muted-foreground">
            Keine Karten fällig. Du hast alle Karten für heute gelernt.
          </p>
          {nextDue && (
            <p className="text-sm text-muted-foreground">
              Nächste Karte fällig:{' '}
              <span className="font-medium text-foreground">
                {new Date(nextDue).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </p>
          )}
          {nextDue == null && (
            <p className="text-sm text-muted-foreground">
              Noch keine reviewed Karten vorhanden. Überprüfe zuerst generierte Karten.
            </p>
          )}
          <Button asChild variant="outline" className="mt-2">
            <Link href={backHref}>
              <BookOpen className="mr-2 h-4 w-4" />
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
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            {themaName}
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 max-w-sm mx-auto">
          <CheckCircle2 className="h-14 w-14 text-green-500" />
          <h2 className="text-2xl font-bold">Session abgeschlossen!</h2>
          <p className="text-muted-foreground">
            Du hast alle <span className="font-semibold text-foreground">{done}</span> fälligen{' '}
            {done === 1 ? 'Karte' : 'Karten'} für heute gelernt.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setIdx(0)
                setDone(0)
                setSessionComplete(false)
                setLoading(true)
                fetch(`/api/karten?thema_id=${themaId}&status=reviewed&due=true`)
                  .then((r) => r.json())
                  .then((data: Karte[]) => {
                    setKarten(data)
                    setLoading(false)
                  })
              }}
            >
              Nochmal
            </Button>
            <Button asChild>
              <Link href={backHref}>
                <BookOpen className="mr-2 h-4 w-4" />
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
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          {themaName}
        </Link>
      </div>

      <div className="max-w-xl">
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
