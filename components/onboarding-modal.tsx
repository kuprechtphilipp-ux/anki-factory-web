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
import type { Lernfenster } from '@/lib/types'
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

const LERNFENSTER_OPTIONS: { value: Lernfenster; label: string }[] = [
  { value: 'gestresst', label: 'Sehr gestresst' },
  { value: 'normal', label: 'Normal' },
  { value: 'entspannt', label: 'Entspannt' },
]

export function OnboardingModal({ open, onOpenChange, initial, onSaved }: OnboardingModalProps) {
  const [fachbereich, setFachbereich] = useState('')
  const [lernziel, setLernziel] = useState('')
  const [lernfenster, setLernfenster] = useState<Lernfenster | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setFachbereich(initial?.fachbereich ?? '')
      setLernziel(initial?.lernziel ?? '')
      setLernfenster(initial?.lernfenster ?? null)
    }
  }, [open, initial])

  async function handleSubmit() {
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fachbereich: fachbereich.trim() || null,
          lernziel: lernziel.trim() || null,
          lernfenster,
          onboarding_completed: true,
        }),
      })
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
          <DialogTitle className="text-center">Hey, ich bin Cramo</DialogTitle>
          <DialogDescription className="text-center">
            Bevor wir loslegen, ein paar schnelle Fragen — dann weiß ich, wie ich am besten mit dir rede.
          </DialogDescription>
        </DialogHeader>

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
            <div className="grid grid-cols-3 gap-2">
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

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Los geht\'s'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
