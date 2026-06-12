'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LERNFENSTER_OPTIONS, type Lernfenster, type Plan } from '@/lib/types'
import { PlanBadge } from '@/components/plan-badge'
import { toast } from 'sonner'

interface OnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: {
    fachbereich: string | null
    lernziel: string | null
    lernfenster: Lernfenster | null
  }
  onSaved?: () => void
}

interface PlanInfo {
  plan: Plan
  credits_total: number
}

// PWAs resuming from the background can briefly have a stale session
// cookie, causing the first request after launch to fail. Retry once
// after a short delay before surfacing an error to the user.
async function patchProfile(body: Record<string, unknown>): Promise<Response> {
  const opts = {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
  const res = await fetch('/api/profile', opts)
  if (res.ok) return res

  await new Promise((resolve) => setTimeout(resolve, 600))
  return fetch('/api/profile', opts)
}

export function OnboardingModal({ open, onOpenChange, initial, onSaved }: OnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [fachbereich, setFachbereich] = useState('')
  const [lernziel, setLernziel] = useState('')
  const [lernfenster, setLernfenster] = useState<Lernfenster | null>(null)
  const [saving, setSaving] = useState(false)
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)

  useEffect(() => {
    if (open) {
      setStep(1)
      setFachbereich(initial?.fachbereich ?? '')
      setLernziel(initial?.lernziel ?? '')
      setLernfenster(initial?.lernfenster ?? null)
    }
  }, [open, initial])

  async function handleNext() {
    setSaving(true)
    try {
      const res = await patchProfile({
        fachbereich: fachbereich.trim() || null,
        lernziel: lernziel.trim() || null,
        lernfenster,
      })
      if (!res.ok) {
        toast.error('Konnte Angaben nicht speichern.')
        return
      }

      const profileRes = await fetch('/api/profile')
      if (profileRes.ok) {
        const data = await profileRes.json() as { plan: Plan; credits_total: number }
        setPlanInfo({ plan: data.plan, credits_total: data.credits_total })
      }

      setStep(2)
    } finally {
      setSaving(false)
    }
  }

  async function handleFinish() {
    setSaving(true)
    try {
      const res = await patchProfile({ onboarding_completed: true })
      if (!res.ok) {
        toast.error('Konnte Angaben nicht speichern.')
        return
      }
      onSaved?.()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-2">
            <img
              src="/icons/Cramo_Icons/Cramo_dark_background.jpeg"
              alt="Cramo"
              className="h-20 w-20 rounded-full object-cover"
            />
          </div>
          {step === 1 ? (
            <>
              <DialogTitle className="text-center">Hey, ich bin Cramo</DialogTitle>
              <DialogDescription className="text-center">
                Bevor wir loslegen, ein paar schnelle Fragen — dann weiß ich, wie ich am besten mit dir rede.
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle className="text-center">Eine Sache noch</DialogTitle>
              <DialogDescription className="text-center">
                Oben siehst du jetzt deinen Plan und deine Credits.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fachbereich">Fachbereich / Studienfach</Label>
              <Input
                id="fachbereich"
                placeholder="z. B. Betriebswirtschaft"
                value={fachbereich}
                onChange={(e) => setFachbereich(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lernziel">Was ist gerade dein wichtigstes Lernziel?</Label>
              <Input
                id="lernziel"
                placeholder="z. B. Prüfung in Statistik bestehen"
                value={lernziel}
                onChange={(e) => setLernziel(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Wie ist dein Lernfenster gerade?</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {LERNFENSTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLernfenster(opt.value)}
                    className={cn(
                      'rounded-lg border-2 px-2 py-2.5 text-xs font-medium text-center transition-all',
                      lernfenster === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Diese Angaben beeinflussen nur, wie Cramo mit dir spricht — nicht, wie deine Karteikarten erstellt werden.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed">
              Du bist aktuell auf dem{' '}
              {planInfo && <PlanBadge plan={planInfo.plan} className="align-middle" />}
              {' '}Plan mit{' '}
              <span className="font-semibold">{planInfo?.credits_total ?? '...'}</span> AI-Credits. Die brauchst du
              für Karten-Generierung, Quiz &amp; Co.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Mehr dazu zeig ich dir gleich noch kurz in der Tour.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <Button onClick={handleNext} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Weiter'}
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Los geht\'s'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
