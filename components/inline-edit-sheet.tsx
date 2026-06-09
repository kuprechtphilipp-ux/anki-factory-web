'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { Karte } from '@/lib/types'

interface Props {
  karte: Karte | null
  onClose: () => void
  onSave: (updated: Karte) => void
}

export function InlineEditSheet({ karte, onClose, onSave }: Props) {
  const [frage, setFrage] = useState('')
  const [antwort, setAntwort] = useState('')
  const [clozeText, setClozeText] = useState('')
  const [kontext, setKontext] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!karte) return
    setFrage(karte.frage ?? '')
    setAntwort(karte.antwort ?? '')
    setClozeText(karte.cloze_text ?? '')
    setKontext(karte.kontext ?? '')
    setTags(Array.isArray(karte.tags) ? karte.tags.join(', ') : '')
  }, [karte])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave() {
    if (!karte) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        kontext: kontext.trim() || null,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      if (karte.typ === 'cloze') {
        body.cloze_text = clozeText.trim() || null
      } else {
        body.frage = frage.trim()
        body.antwort = antwort.trim()
      }

      const res = await fetch(`/api/karte/${karte.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { toast.error('Speichern fehlgeschlagen'); return }
      const updated: Karte = await res.json()
      toast.success('Karte gespeichert')
      onSave(updated)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!karte) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-[420px] flex flex-col bg-card rounded-t-2xl sm:rounded-2xl border border-border/60 shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
          <div>
            <p className="text-sm font-semibold">Karte bearbeiten</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {karte.typ === 'cloze' ? 'Lückentext' : 'Frage / Antwort'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {karte.typ === 'cloze' ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lückentext</Label>
              <Textarea
                value={clozeText}
                onChange={e => setClozeText(e.target.value)}
                rows={5}
                className="resize-none bg-muted/40 font-mono text-sm"
                placeholder="Die Hauptstadt von {{c1::Deutschland}} ist {{c2::Berlin}}."
              />
              <p className="text-[10px] text-muted-foreground">{`{{c1::Antwort}}`}</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Frage</Label>
                <Textarea
                  value={frage}
                  onChange={e => setFrage(e.target.value)}
                  rows={3}
                  className="resize-none bg-muted/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Antwort</Label>
                <Textarea
                  value={antwort}
                  onChange={e => setAntwort(e.target.value)}
                  rows={3}
                  className="resize-none bg-muted/40"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kontext <span className="normal-case font-normal">(optional)</span>
            </Label>
            <Textarea
              value={kontext}
              onChange={e => setKontext(e.target.value)}
              rows={2}
              className="resize-none bg-muted/40"
              placeholder="Hintergrundinformation…"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tags <span className="normal-case font-normal">(kommagetrennt)</span>
            </Label>
            <Input
              value={tags}
              onChange={e => setTags(e.target.value)}
              className="bg-muted/40"
              placeholder="definition, formel"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-border/50 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 h-10">
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 h-10 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Speichern
          </Button>
        </div>
      </div>
    </>
  )
}
