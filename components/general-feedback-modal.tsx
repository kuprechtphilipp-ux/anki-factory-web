'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Bug, Lightbulb, MessageCircle, CheckCircle2, X } from 'lucide-react'
import type { FeedbackCategory } from '@/lib/types'

interface GeneralFeedbackModalProps {
  open: boolean
  onClose: () => void
}

const CATEGORIES: { value: FeedbackCategory; label: string; icon: typeof Bug }[] = [
  { value: 'bug', label: 'Bug melden', icon: Bug },
  { value: 'idee', label: 'Idee / Wunsch', icon: Lightbulb },
  { value: 'sonstiges', label: 'Sonstiges', icon: MessageCircle },
]

export function GeneralFeedbackModal({ open, onClose }: GeneralFeedbackModalProps) {
  const [category, setCategory] = useState<FeedbackCategory>('bug')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  function handleClose() {
    onClose()
    setTimeout(() => {
      setCategory('bug')
      setMessage('')
      setDone(false)
    }, 300)
  }

  async function handleSubmit() {
    if (!message.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/feedback-general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message }),
      })
      if (res.ok) setDone(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border border-border/50 shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <MessageCircle className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-sm font-semibold">Feedback geben</p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 flex flex-col items-center gap-3 animate-fade-in">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-base">Danke für dein Feedback!</p>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Wir haben deine Nachricht erhalten. Du kannst uns auch jederzeit direkt unter{' '}
                <a href="mailto:hello@cramo.ch" className="underline hover:text-foreground">hello@cramo.ch</a> erreichen.
              </p>
            </div>
            <Button size="sm" variant="outline" className="h-8 mt-1" onClick={handleClose}>
              Schliessen
            </Button>
          </div>
        ) : (
          <div className="px-6 py-6 space-y-5 animate-fade-in">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Worum geht's?</p>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setCategory(value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border py-3 px-1.5 transition-all hover:scale-105 active:scale-95 ${
                      category === value
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border/50 hover:border-primary/40 hover:bg-muted/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Deine Nachricht</p>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Was ist los? Je konkreter, desto besser können wir helfen."
                rows={4}
                className="resize-none text-sm"
                autoFocus
              />
            </div>

            <Button
              className="w-full h-9 gap-1.5"
              onClick={handleSubmit}
              disabled={saving || !message.trim()}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Absenden'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
