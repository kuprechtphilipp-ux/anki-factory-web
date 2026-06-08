'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import type { Karte } from '@/lib/types'

interface Props {
  karte: Karte
  current: number
  total: number
  onRate: (rating: 1 | 2 | 3 | 4) => Promise<void>
  loading?: boolean
}

function maskCloze(text: string): string {
  return text.replace(/\{\{c\d+::([^}]+)\}\}/g, '[...]')
}

function unmaskCloze(text: string): string {
  return text.replace(/\{\{c\d+::([^}]+)\}\}/g, (_, answer) => `**${answer}**`)
}

export function LernCard({ karte, current, total, onRate, loading }: Props) {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setRevealed(false)
  }, [karte.id])

  const isCloze = karte.typ === 'cloze'

  const questionText = isCloze
    ? maskCloze(karte.cloze_text ?? karte.frage)
    : karte.frage

  const answerText = isCloze
    ? unmaskCloze(karte.cloze_text ?? karte.antwort)
    : karte.antwort

  const progress = total > 0 ? ((current - 1) / total) * 100 : 0

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{current} von {total} Karten</span>
          <Badge variant="outline" className="text-xs">
            {isCloze ? 'Cloze' : 'Basic'}
          </Badge>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Card */}
      <div className="rounded-lg border bg-card min-h-[200px] flex flex-col">
        {/* Slide image */}
        {karte.image_b64 && (
          <div className="border-b px-6 pt-5">
            <img
              src={`data:image/jpeg;base64,${karte.image_b64}`}
              alt="Folienbild"
              className="w-full max-h-44 object-contain rounded"
            />
          </div>
        )}

        {/* Question */}
        <div className="px-6 pt-6 pb-4 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            {isCloze ? 'Lückentext' : 'Frage'}
          </p>
          <p className="text-lg leading-relaxed whitespace-pre-wrap">{questionText}</p>
        </div>

        {/* Divider + Answer */}
        {revealed && (
          <>
            <div className="border-t mx-6" />
            <div className="px-6 pt-4 pb-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Antwort
              </p>
              <p
                className="text-base leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: answerText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'),
                }}
              />
              {karte.kontext && (
                <p className="mt-3 text-sm text-muted-foreground border-l-2 pl-3 italic">
                  {karte.kontext}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Buttons */}
      {!revealed ? (
        <Button
          className="w-full"
          size="lg"
          onClick={() => setRevealed(true)}
          disabled={loading}
        >
          Antwort zeigen
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-center text-muted-foreground">Wie gut wusstest du es?</p>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="flex flex-col h-auto py-2 gap-0.5 border-destructive/60 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => onRate(1)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                <>
                  <span className="text-sm font-semibold">Nochmal</span>
                  <span className="text-[10px] opacity-70">{'<1 Min'}</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-2 gap-0.5 border-orange-400/60 text-orange-600 hover:bg-orange-500 hover:text-white dark:text-orange-400"
              onClick={() => onRate(2)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                <>
                  <span className="text-sm font-semibold">Schwer</span>
                  <span className="text-[10px] opacity-70">kurz</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-2 gap-0.5 border-blue-400/60 text-blue-600 hover:bg-blue-500 hover:text-white dark:text-blue-400"
              onClick={() => onRate(3)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                <>
                  <span className="text-sm font-semibold">Gut</span>
                  <span className="text-[10px] opacity-70">Tage</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-auto py-2 gap-0.5 border-green-400/60 text-green-600 hover:bg-green-500 hover:text-white dark:text-green-400"
              onClick={() => onRate(4)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
                <>
                  <span className="text-sm font-semibold">Einfach</span>
                  <span className="text-[10px] opacity-70">lange</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Tags */}
      {karte.tags && karte.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {karte.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
