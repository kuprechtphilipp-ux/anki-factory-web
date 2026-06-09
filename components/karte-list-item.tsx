'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronDown, ChevronRight, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Karte, KartStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<KartStatus, string> = {
  neu: 'Neu',
  reviewed: 'Überprüft',
  exportiert: 'Exportiert',
  verworfen: 'Verworfen',
}

const STATUS_VARIANT: Record<KartStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  neu: 'secondary',
  reviewed: 'default',
  exportiert: 'outline',
  verworfen: 'destructive',
}

interface Props {
  karte: Karte
  onUpdate?: (updated: Karte) => void
  onDelete?: (id: number) => void
}

export function KarteListItem({ karte, onUpdate, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [editFrage, setEditFrage] = useState(karte.frage)
  const [editAntwort, setEditAntwort] = useState(karte.antwort)
  const [editCloze, setEditCloze] = useState(karte.cloze_text ?? '')
  const [editKontext, setEditKontext] = useState(karte.kontext ?? '')
  const [editTags, setEditTags] = useState((karte.tags ?? []).join(', '))
  const [editStatus, setEditStatus] = useState<KartStatus>(karte.status)

  function startEdit() {
    setEditFrage(karte.frage)
    setEditAntwort(karte.antwort)
    setEditCloze(karte.cloze_text ?? '')
    setEditKontext(karte.kontext ?? '')
    setEditTags((karte.tags ?? []).join(', '))
    setEditStatus(karte.status)
    setEditing(true)
    setOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const tags = editTags.split(',').map(t => t.trim()).filter(Boolean)
      const body: Partial<Karte> = {
        frage: editFrage,
        antwort: editAntwort,
        cloze_text: editCloze || null,
        kontext: editKontext || null,
        tags,
        status: editStatus,
      }
      const res = await fetch(`/api/karte/${karte.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { toast.error('Speichern fehlgeschlagen'); return }
      const updated = await res.json() as Karte
      toast.success('Karte gespeichert')
      setEditing(false)
      onUpdate?.(updated)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Karte wirklich löschen?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/karte/${karte.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Löschen fehlgeschlagen'); return }
      toast.success('Karte gelöscht')
      onDelete?.(karte.id)
    } finally {
      setDeleting(false)
    }
  }

  const preview = karte.typ === 'cloze' ? (karte.cloze_text ?? '') : karte.frage

  return (
    <div className={cn('rounded-lg border transition-colors', open && 'bg-muted/20')}>
      <div className="flex w-full items-start gap-2 p-3">
        <button
          onClick={() => { if (!editing) setOpen(!open) }}
          className="flex flex-1 items-start gap-3 text-left min-w-0"
        >
          {open ? (
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm line-clamp-2">{preview || '(leer)'}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <Badge variant="outline" className="text-xs h-5">{karte.typ}</Badge>
              <Badge variant={STATUS_VARIANT[karte.status]} className="text-xs h-5">
                {STATUS_LABEL[karte.status]}
              </Badge>
              {karte.tags?.map((tag) => {
                if (tag === 'fokus') {
                  return <Badge key={tag} className="text-[10px] h-5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50 hover:bg-amber-100">🎯 Fokus</Badge>
                }
                if (tag === 'core') {
                  return <Badge key={tag} className="text-[10px] h-5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50 hover:bg-blue-100">Core</Badge>
                }
                if (tag === 'detail') {
                  return <Badge key={tag} variant="outline" className="text-[10px] h-5 text-muted-foreground/80">Detail</Badge>
                }
                return <Badge key={tag} variant="secondary" className="text-[10px] h-5">{tag}</Badge>
              })}
              {karte.slide_nr != null && (
                <span className="text-xs text-muted-foreground">Folie {karte.slide_nr}</span>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {!editing && (
            <button
              onClick={startEdit}
              className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Bearbeiten"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Löschen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 text-sm border-t pt-3 ml-7">
          {editing ? (
            <>
              {karte.typ === 'basic' ? (
                <>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frage</p>
                    <Textarea
                      value={editFrage}
                      onChange={(e) => setEditFrage(e.target.value)}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Antwort</p>
                    <Textarea
                      value={editAntwort}
                      onChange={(e) => setEditAntwort(e.target.value)}
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lückentext</p>
                  <Textarea
                    value={editCloze}
                    onChange={(e) => setEditCloze(e.target.value)}
                    rows={3}
                    className="text-sm resize-none font-mono"
                  />
                </div>
              )}

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kontext</p>
                <Textarea
                  value={editKontext}
                  onChange={(e) => setEditKontext(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                  placeholder="Optional…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</p>
                  <Input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="tag1, tag2"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as KartStatus)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neu">Neu</SelectItem>
                      <SelectItem value="reviewed">Überprüft</SelectItem>
                      <SelectItem value="verworfen">Verworfen</SelectItem>
                      <SelectItem value="exportiert">Exportiert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Speichern
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-7 gap-1.5">
                  <X className="h-3.5 w-3.5" />
                  Abbrechen
                </Button>
              </div>
            </>
          ) : (
            <>
              {karte.typ === 'basic' ? (
                <>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Frage</p>
                    <p className="whitespace-pre-wrap">{karte.frage || '–'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Antwort</p>
                    <p className="whitespace-pre-wrap">{karte.antwort || '–'}</p>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Lückentext</p>
                  <p className="whitespace-pre-wrap font-mono text-xs bg-muted px-2 py-1.5 rounded">
                    {karte.cloze_text || '–'}
                  </p>
                </div>
              )}

              {karte.kontext && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Kontext</p>
                  <p className="whitespace-pre-wrap text-muted-foreground">{karte.kontext}</p>
                </div>
              )}

              {karte.image_b64 && (
                <img
                  src={`data:image/jpeg;base64,${karte.image_b64}`}
                  alt="Folienbild"
                  className="max-h-40 object-contain rounded border"
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
