'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import { PlanBadge } from '@/components/plan-badge'
import type { Plan } from '@/lib/types'

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetPlan: Plan
}

export function UpgradeDialog({ open, onOpenChange, targetPlan }: UpgradeDialogProps) {
  const isUltra = targetPlan === 'ultra'

  const subject = isUltra
    ? 'Anki Factory - Einladungscode für Ultra-Plan'
    : `Anki Factory - Upgrade auf ${targetPlan}`
  const mailtoHref = `mailto:philipp.kuprecht@student.unisg.ch?subject=${encodeURIComponent(subject)}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mehr Credits gewünscht?</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 pt-1">
            <PlanBadge plan={targetPlan} />
          </DialogDescription>
        </DialogHeader>

        {isUltra ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Der Ultra-Plan wird aktuell über einen persönlichen Einladungscode aktiviert. Schreib
            mir kurz eine Mail, dann schicke ich dir deinen Code.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Mehr Credits gibt es aktuell nur direkt über mich — schreib mir kurz eine Mail, dann
            schalte ich dein Upgrade frei.
          </p>
        )}

        <DialogFooter>
          <Button asChild className="w-full sm:w-auto">
            <a href={mailtoHref}>
              <Mail className="h-4 w-4" />
              Mail schreiben
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
