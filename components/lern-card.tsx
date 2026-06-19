'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Eye } from 'lucide-react'
import { KarteMarkdown } from '@/components/karte-markdown'
import { maskCloze, unmaskCloze } from '@/lib/cloze'
import type { Karte } from '@/lib/types'

interface Props {
  karte: Karte
  current: number
  total: number
  onRate: (rating: 1 | 2 | 3 | 4) => Promise<void>
  loading?: boolean
}

export function LernCard({ karte, current, total, onRate, loading }: Props) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => { setRevealed(false) }, [karte.id])

  const isCloze = karte.typ === 'cloze'
  const questionText = isCloze ? maskCloze(karte.cloze_text ?? karte.frage) : karte.frage
  const answerText = isCloze ? unmaskCloze(karte.cloze_text ?? karte.antwort) : karte.antwort
  const progressPct = total > 0 ? ((current - 1) / total) * 100 : 0

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Progress bar + counter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {current} <span className="text-muted-foreground/50">/ {total}</span>
          </span>
          <Badge
            variant="secondary"
            className="text-[10px] font-semibold uppercase tracking-wide h-5 px-2"
          >
            {isCloze ? 'Lückentext' : 'Frage & Antwort'}
          </Badge>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-2xl bg-card shadow-card border border-border/50 overflow-hidden">
        {/* Question */}
        <div className="px-7 pt-7 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4">
            {isCloze ? 'Lückentext' : 'Frage'}
          </p>
          <KarteMarkdown
            content={questionText}
            className="text-xl leading-relaxed font-medium whitespace-pre-wrap text-foreground"
          />
        </div>

        {/* Answer (revealed) */}
        {revealed && (
          <>
            <div className="mx-7 border-t border-border/50" />
            <div className="px-7 pt-5 pb-7 bg-muted/30">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3">
                Antwort
              </p>
              <KarteMarkdown
                content={answerText}
                className="text-base leading-relaxed whitespace-pre-wrap text-foreground [&_strong]:text-primary"
              />
              {karte.kontext && (
                <div className="mt-4 text-sm text-muted-foreground border-l-2 border-primary/30 pl-3.5 italic leading-relaxed">
                  <KarteMarkdown content={karte.kontext} />
                </div>
              )}
              {karte.image_b64 && (
                <img
                  src={`data:image/jpeg;base64,${karte.image_b64}`}
                  alt="Folienbild"
                  className="mt-4 w-full max-h-48 object-contain rounded-lg border border-border/50"
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* CTA / Rating buttons */}
      {!revealed ? (
        <Button
          className="w-full h-12 text-base gap-2 shadow-sm rounded-xl"
          onClick={() => setRevealed(true)}
          disabled={loading}
        >
          <Eye className="h-4.5 w-4.5 h-[18px] w-[18px]" />
          Antwort zeigen
        </Button>
      ) : (
        <div className="space-y-3 animate-fade-in">
          <p className="text-xs text-center font-medium text-muted-foreground uppercase tracking-wider">
            Wie gut wusstest du es?
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            <RatingButton
              onClick={() => onRate(1)}
              loading={!!loading}
              label="Nochmal"
              sublabel="< 1 Min"
              colorClass="border-red-200 text-red-600 hover:bg-red-500 hover:text-white hover:border-red-500 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-600 dark:hover:border-red-600"
            />
            <RatingButton
              onClick={() => onRate(2)}
              loading={!!loading}
              label="Schwer"
              sublabel="kurz"
              colorClass="border-orange-200 text-orange-600 hover:bg-orange-500 hover:text-white hover:border-orange-500 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-600 dark:hover:border-orange-600"
            />
            <RatingButton
              onClick={() => onRate(3)}
              loading={!!loading}
              label="Gut"
              sublabel="Tage"
              colorClass="border-blue-200 text-blue-600 hover:bg-blue-500 hover:text-white hover:border-blue-500 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:border-blue-600"
            />
            <RatingButton
              onClick={() => onRate(4)}
              loading={!!loading}
              label="Einfach"
              sublabel="lange"
              colorClass="border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:border-emerald-600"
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {karte.tags && karte.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {karte.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function RatingButton({
  onClick,
  loading,
  label,
  sublabel,
  colorClass,
}: {
  onClick: () => void
  loading: boolean
  label: string
  sublabel: string
  colorClass: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 px-2 text-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${colorClass}`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <>
          <span className="text-sm font-semibold leading-none">{label}</span>
          <span className="text-[10px] opacity-60 leading-none">{sublabel}</span>
        </>
      )}
    </button>
  )
}
