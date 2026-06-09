'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Check, Brain } from 'lucide-react'

const STUDY_TIPS = [
  'Active Recall: Dein Gehirn lernt am effektivsten, wenn du dich aktiv abfragst — nicht durch passives Durchlesen.',
  'Spaced Repetition spart bis zu 50% der Lernzeit: Karten kurz vor dem Vergessen zu wiederholen ist weitaus effizienter als massen-lernen.',
  'Der FSRS-Algorithmus berechnet für jede Karte den exakten Moment, bevor du sie vergisst — und plant genau dort die Wiederholung.',
  'Schlaf festigt Wissen: Im Tiefschlaf überträgt das Gehirn neu Gelerntes ins Langzeitgedächtnis. Lerne also lieber abends als nachts.',
  'Pareto-Prinzip: 80% der Klausurpunkte stammen oft aus 20% des Stoffs. Fokus-Karten markieren genau diesen Kernstoff.',
  'Feynman-Technik: Erkläre ein Konzept in einfachen Worten. Wenn du strauchlerst, ist das die Lücke in deinem Verständnis.',
  'Interleaving: Mische verschiedene Themen beim Lernen. Monotones Wiederholen einer Kategorie erzeugt Scheinkompetenz.',
]

const PHASES = [
  { label: 'PDF lesen & Text extrahieren' },
  { label: 'Inhalt analysieren & strukturieren' },
  { label: 'Schlüsselkonzepte identifizieren' },
  { label: 'Karten formulieren & verfassen' },
  { label: 'Qualität prüfen & optimieren' },
]

const PHASE_THRESHOLDS = [0, 18, 36, 57, 78]

interface Props {
  progress?: number
  isAutoBatch?: boolean
  currentBatch?: number
  totalBatches?: number
  batchLabel?: string
  pagesFrom?: number
  pagesTo?: number
  targetCards?: number
}

export function FactoryLoader({
  progress = 0,
  isAutoBatch = false,
  currentBatch = 1,
  totalBatches = 1,
  batchLabel,
  pagesFrom,
  pagesTo,
  targetCards,
}: Props) {
  const [tipIdx, setTipIdx] = useState(0)
  const [prevTipIdx, setPrevTipIdx] = useState(0)
  const [tipVisible, setTipVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setTipVisible(false)
      setTimeout(() => {
        setPrevTipIdx(tipIdx)
        setTipIdx(prev => (prev + 1) % STUDY_TIPS.length)
        setTipVisible(true)
      }, 400)
    }, 7000)
    return () => clearInterval(interval)
  }, [tipIdx])

  const currentPhaseIdx = PHASE_THRESHOLDS.reduce(
    (last, threshold, idx) => (progress >= threshold ? idx : last),
    0
  )

  const metaLine = (() => {
    const parts: string[] = []
    if (isAutoBatch && totalBatches > 1) parts.push(`Batch ${currentBatch} von ${totalBatches}`)
    if (pagesFrom && pagesTo) parts.push(`Seiten ${pagesFrom}–${pagesTo}`)
    if (targetCards) parts.push(`~${targetCards} Karten`)
    return parts.join(' · ')
  })()

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/80 via-card to-indigo-50/20 dark:from-violet-950/30 dark:via-card dark:to-indigo-950/10 shadow-lg">

      {/* Top accent line */}
      <div className="h-[3px] w-full bg-gradient-to-r from-violet-500 via-indigo-400 to-violet-500 opacity-70" />

      <div className="p-5 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0 mt-0.5">
            <div className="absolute inset-0 rounded-full bg-violet-400/30 dark:bg-violet-500/20 animate-ping [animation-duration:2s]" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/60 dark:to-indigo-900/60 border border-violet-200/70 dark:border-violet-700/50 shadow-sm">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground leading-snug">
              {isAutoBatch && totalBatches > 1
                ? `Batch ${currentBatch} von ${totalBatches} wird generiert`
                : 'Karten werden generiert'}
            </p>
            {batchLabel && (
              <p className="text-xs font-medium text-violet-700 dark:text-violet-300 mt-0.5 truncate">
                {batchLabel}
              </p>
            )}
            {metaLine && (
              <p className="text-xs text-muted-foreground mt-0.5">{metaLine}</p>
            )}
          </div>
        </div>

        {/* ── Phase stepper ── */}
        <div className="space-y-2.5">
          {PHASES.map((phase, idx) => {
            const isDone = idx < currentPhaseIdx
            const isActive = idx === currentPhaseIdx
            const isPending = idx > currentPhaseIdx

            return (
              <div
                key={idx}
                className={`flex items-center gap-3 transition-all duration-500 ${
                  isPending ? 'opacity-25' : isDone ? 'opacity-60' : 'opacity-100'
                }`}
              >
                {/* Indicator */}
                {isDone ? (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-700/50">
                    <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                  </div>
                ) : isActive ? (
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-full bg-violet-400/40 dark:bg-violet-600/30 animate-ping [animation-duration:1.6s]" />
                    <div className="relative h-5 w-5 rounded-full bg-violet-100 dark:bg-violet-900/60 border-2 border-violet-500 dark:border-violet-400 flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-400" />
                    </div>
                  </div>
                ) : (
                  <div className="h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground/20 bg-transparent" />
                )}

                {/* Label */}
                <span className={`text-xs leading-tight transition-colors duration-300 ${
                  isActive
                    ? 'text-violet-700 dark:text-violet-300 font-semibold'
                    : 'text-muted-foreground'
                }`}>
                  {phase.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* ── Progress bar ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
              Fortschritt
            </span>
            <span className="text-xs font-bold tabular-nums text-violet-700 dark:text-violet-300">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60 border border-border/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-400 to-violet-400 transition-all duration-700 ease-out"
              style={{
                width: `${progress}%`,
                boxShadow: progress > 0 ? '0 0 10px rgba(139,92,246,0.5)' : 'none',
              }}
            />
          </div>
        </div>

        {/* ── Study tip ── */}
        <div className="pt-1 border-t border-border/40 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3 w-3 text-muted-foreground/40 shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">
              Lerntipp
            </p>
          </div>
          <p
            className="text-[11.5px] text-muted-foreground leading-relaxed italic transition-opacity duration-400"
            style={{ opacity: tipVisible ? 1 : 0 }}
          >
            &ldquo;{STUDY_TIPS[tipVisible ? tipIdx : prevTipIdx]}&rdquo;
          </p>
        </div>

      </div>
    </div>
  )
}
