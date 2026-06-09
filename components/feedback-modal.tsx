'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, ChevronRight, X, CheckCircle2 } from 'lucide-react'
import type { DeckFeedback } from '@/lib/types'

interface FeedbackModalProps {
  open: boolean
  onClose: () => void
  themaId: number | null
  kartenCount: number
  lodUsed: string
}

type Step = 'rating' | 'chips' | 'text' | 'done'

const RATINGS = [
  { value: 1, emoji: '😕', label: 'Schwach' },
  { value: 2, emoji: '😐', label: 'Okay' },
  { value: 3, emoji: '🙂', label: 'Gut' },
  { value: 4, emoji: '😄', label: 'Super' },
]

const CHIP_OPTIONS = {
  detailgrad: ['zu wenig', 'passt', 'zu viel'],
  kartenmenge: ['zu wenig', 'passt', 'zu viel'],
  kartentyp: ['mehr Basic', 'passt', 'mehr Cloze'],
}

const CHIP_LABELS: Record<string, string> = {
  detailgrad: 'Detailgrad',
  kartenmenge: 'Kartenmenge',
  kartentyp: 'Kartentyp',
}

export function FeedbackModal({ open, onClose, themaId, kartenCount, lodUsed }: FeedbackModalProps) {
  const [step, setStep] = useState<Step>('rating')
  const [rating, setRating] = useState<number | null>(null)
  const [chips, setChips] = useState<Record<string, string>>({})
  const [freitext, setFreitext] = useState('')
  const [saving, setSaving] = useState(false)

  function handleRating(value: number) {
    setRating(value)
    setTimeout(() => setStep('chips'), 320)
  }

  function toggleChip(group: string, value: string) {
    setChips((prev) => ({ ...prev, [group]: prev[group] === value ? '' : value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body: DeckFeedback = {
        thema_id: themaId,
        rating,
        detailgrad_feedback: chips.detailgrad || null,
        kartenmenge_feedback: chips.kartenmenge || null,
        kartentyp_feedback: chips.kartentyp || null,
        freitext: freitext.trim() || null,
        karten_count: kartenCount,
        lod_used: lodUsed,
      }
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setStep('done')
      setTimeout(() => {
        handleClose()
      }, 1800)
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    onClose()
    setTimeout(() => {
      setStep('rating')
      setRating(null)
      setChips({})
      setFreitext('')
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border border-border/50 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Deck bewerten</p>
              <p className="text-[11px] text-muted-foreground">{kartenCount} Karten · {lodUsed}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Step: Rating */}
        {step === 'rating' && (
          <div className="px-6 py-6 space-y-5 animate-fade-in">
            <div>
              <p className="text-base font-semibold">Wie war dieses Deck?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Hilft mir, beim nächsten Mal bessere Karten zu generieren.</p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => handleRating(r.value)}
                  className={`group flex flex-col items-center gap-1.5 rounded-xl border py-3.5 px-2 transition-all hover:scale-105 active:scale-95 ${
                    rating === r.value
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border/50 hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <span className="text-2xl leading-none">{r.emoji}</span>
                  <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{r.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleClose}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Überspringen
            </button>
          </div>
        )}

        {/* Step: Chips */}
        {step === 'chips' && (
          <div className="px-6 py-6 space-y-5 animate-fade-in">
            <div>
              <p className="text-base font-semibold">Was war gut oder nicht?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Optional — wähle was zutrifft.</p>
            </div>

            <div className="space-y-4">
              {(Object.keys(CHIP_OPTIONS) as (keyof typeof CHIP_OPTIONS)[]).map((group) => (
                <div key={group} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {CHIP_LABELS[group]}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {CHIP_OPTIONS[group].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => toggleChip(group, opt)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all hover:scale-105 active:scale-95 ${
                          chips[group] === opt
                            ? opt === 'passt'
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-700'
                              : 'border-primary bg-primary/10 text-primary'
                            : 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-9 text-muted-foreground"
                onClick={handleClose}
              >
                Überspringen
              </Button>
              <Button
                size="sm"
                className="flex-1 h-9 gap-1.5"
                onClick={() => setStep('text')}
              >
                Weiter
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Freitext */}
        {step === 'text' && (
          <div className="px-6 py-6 space-y-5 animate-fade-in">
            <div>
              <p className="text-base font-semibold">Noch etwas?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Freitext — komplett optional.</p>
            </div>

            <Textarea
              value={freitext}
              onChange={(e) => setFreitext(e.target.value)}
              placeholder="z.B. &quot;Cloze-Karten waren oft unklar...&quot;"
              rows={3}
              className="resize-none text-sm"
              autoFocus
            />

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 h-9 text-muted-foreground"
                onClick={handleSave}
                disabled={saving}
              >
                Ohne Text speichern
              </Button>
              <Button
                size="sm"
                className="flex-1 h-9 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    Speichern
                    <Sparkles className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="px-6 py-10 flex flex-col items-center gap-3 animate-fade-in">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-base">Danke für dein Feedback!</p>
              <p className="text-xs text-muted-foreground">Wird beim nächsten Pre-Scan berücksichtigt.</p>
            </div>
          </div>
        )}

        {/* Progress dots */}
        {step !== 'done' && (
          <div className="flex items-center justify-center gap-1.5 pb-4">
            {(['rating', 'chips', 'text'] as Step[]).map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-4 bg-primary'
                    : ['rating', 'chips', 'text'].indexOf(s) < ['rating', 'chips', 'text'].indexOf(step)
                    ? 'w-1.5 bg-primary/40'
                    : 'w-1.5 bg-muted-foreground/20'
                }`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
