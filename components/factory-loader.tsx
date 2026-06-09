'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Brain, Cpu, Layers } from 'lucide-react'

// Scientific study tips
const STUDY_TIPS = [
  'Active Recall: Dein Gehirn lernt am effektivsten, wenn du dich aktiv abfragst, statt Folien nur passiv durchzulesen.',
  'Spaced Repetition: Lerne in größer werdenden Abständen. Das verhindert das Vergessen und spart bis zu 50% der Lernzeit.',
  'Der FSRS-Algorithmus deiner App berechnet den optimalen Wiederholungszeitpunkt, genau bevor du eine Karte vergisst.',
  'Schlaf festigt Wissen: Während des Schlafs werden neue Synapsen gebildet und das Gelernte ins Langzeitgedächtnis übertragen.',
  'Pareto-Prinzip (80/20): 80% der Klausurpunkte stammen meist aus 20% des Stoffs. Konzentriere dich vor allem auf die Core-Karten.',
  'Der Zeigarnik-Effekt: Unerledigte Aufgaben bleiben besser im Kopf. Mach ruhig Pausen mitten in einem schwierigen Kapitel!',
  'Erklärungsmethode (Feynman-Technik): Wenn du ein Konzept einer anderen Person (oder dir selbst) einfach erklären kannst, hast du es wirklich verstanden.'
]

// Dynamic generation phases
const GENERATION_PHASES = [
  { text: 'PDF-Struktur einlesen & Seiten analysieren...', icon: Layers },
  { text: 'Didaktische Gewichtung der Folien bewerten...', icon: Brain },
  { text: 'Klausurrelevante Schlüsselkonzepte filtern...', icon: Sparkles },
  { text: 'Didaktische Basic & Cloze Fragen formulieren...', icon: Cpu },
  { text: 'Core-, Detail- und Fokus-Prioritäten klassifizieren...', icon: Sparkles },
  { text: 'Kartenanzahl optimieren & finale Filter anwenden...', icon: Layers }
]

interface Props {
  progress?: number
  isAutoBatch?: boolean
  currentBatch?: number
  totalBatches?: number
}

export function FactoryLoader({ progress = 0, isAutoBatch = false, currentBatch = 1, totalBatches = 1 }: Props) {
  const [tipIdx, setTipIdx] = useState(0)
  const [phaseIdx, setPhaseIdx] = useState(0)

  // Rotate study tips
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIdx((prev) => (prev + 1) % STUDY_TIPS.length)
    }, 6000)
    return () => clearInterval(tipInterval)
  }, [])

  // Rotate generation phases
  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setPhaseIdx((prev) => (prev + 1) % GENERATION_PHASES.length)
    }, 4500)
    return () => clearInterval(phaseInterval)
  }, [])

  const CurrentPhaseIcon = GENERATION_PHASES[phaseIdx].icon

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-10 w-full max-w-lg mx-auto bg-card/40 border border-border/40 rounded-2xl shadow-card backdrop-blur-sm animate-fade-in">
      
      {/* ── Factory Animation Section ── */}
      <div className="relative w-full h-32 flex items-center justify-center overflow-hidden mb-6">
        
        {/* Conveyor Belt Track */}
        <div className="absolute bottom-6 w-3/4 h-2 bg-muted rounded-full border border-border/50">
          {/* Conveyor rollers */}
          <div className="absolute inset-0 flex justify-between px-2 -top-1">
            <div className="w-4 h-4 bg-muted-foreground/30 rounded-full animate-spin [animation-duration:3s]" />
            <div className="w-4 h-4 bg-muted-foreground/30 rounded-full animate-spin [animation-duration:3s]" />
            <div className="w-4 h-4 bg-muted-foreground/30 rounded-full animate-spin [animation-duration:3s]" />
            <div className="w-4 h-4 bg-muted-foreground/30 rounded-full animate-spin [animation-duration:3s]" />
          </div>
        </div>

        {/* Sliding Knowledge Block (raw data) */}
        <div className="absolute bottom-8 left-1/4 translate-x-[-50%] animate-factory-block flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40">
          <Layers className="h-4 w-4 text-indigo-500 animate-pulse" />
        </div>

        {/* The Card Press Machine */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
          {/* Press stamp */}
          <div className="h-10 w-12 bg-gradient-to-b from-primary to-primary-foreground border border-primary/20 rounded-md shadow animate-factory-press flex items-center justify-center z-10">
            <Cpu className="h-4 w-4 text-white animate-pulse" />
          </div>
          {/* Press base */}
          <div className="h-4 w-16 bg-muted border border-border/60 rounded-t-sm" />
        </div>

        {/* Outcoming stamped Card (stamped Flashcard) */}
        <div className="absolute bottom-8 left-3/4 translate-x-[-50%] animate-factory-card flex h-10 w-8 items-center justify-center rounded border border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-card shadow-sm">
          <Sparkles className="h-3 w-3 text-amber-500 animate-bounce" />
        </div>

        {/* Decorative Synapses Pulsing */}
        <div className="absolute top-2 flex gap-12 text-primary/20 dark:text-primary/10">
          <Brain className="h-10 w-10 animate-pulse [animation-duration:2s]" />
          <Brain className="h-12 w-12 animate-pulse [animation-duration:2.5s] delay-300" />
        </div>
      </div>

      {/* ── Active Status Info ── */}
      <div className="text-center space-y-3 w-full">
        <div className="flex items-center justify-center gap-2 text-primary">
          <CurrentPhaseIcon className="h-4 w-4 animate-spin [animation-duration:4s]" />
          <span className="text-sm font-semibold tracking-wide transition-all duration-300">
            {GENERATION_PHASES[phaseIdx].text}
          </span>
        </div>

        {/* Progress bar / Auto-batch info */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>
              {isAutoBatch 
                ? `Batch ${currentBatch} von ${totalBatches}` 
                : 'Karten werden gedruckt'}
            </span>
            <span className="font-semibold tabular-nums text-primary">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted border border-border/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-400 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Scientific Tips Section (Educational Carousel) ── */}
      <div className="mt-8 pt-5 border-t border-border/40 w-full min-h-[90px] flex flex-col justify-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1.5 text-center">
          💡 didaktischer Lerntipp:
        </p>
        <p className="text-[11.5px] text-muted-foreground leading-relaxed text-center italic transition-all duration-500 ease-in-out">
          &ldquo;{STUDY_TIPS[tipIdx]}&rdquo;
        </p>
      </div>

      {/* Tailwind Animations injected inline */}
      <style jsx global>{`
        @keyframes factory-press {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(12px); filter: brightness(1.2); }
        }
        @keyframes factory-block {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          45% { left: 45%; opacity: 1; transform: translateX(-50%) rotate(0deg); }
          50% { left: 50%; opacity: 0; transform: translateX(-50%) scale(0.8); }
          100% { left: 50%; opacity: 0; }
        }
        @keyframes factory-card {
          0%, 50% { left: 50%; opacity: 0; transform: translateX(-50%) scale(0.8) rotate(0deg); }
          55% { left: 55%; opacity: 1; transform: translateX(-50%) scale(1) rotate(5deg); }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; transform: translateX(-50%) rotate(15deg); }
        }
        .animate-factory-press {
          animation: factory-press 2s infinite ease-in-out;
        }
        .animate-factory-block {
          animation: factory-block 2s infinite linear;
        }
        .animate-factory-card {
          animation: factory-card 2s infinite linear;
        }
      `}</style>
    </div>
  )
}
