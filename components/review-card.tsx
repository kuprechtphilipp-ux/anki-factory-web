'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { Karte, KartTyp } from '@/lib/types'

interface Props {
  karte: Karte
  current: number
  total: number
  onPrev: () => void
  onNext: () => void
  onAccept: (updates: Partial<Karte>) => Promise<void>
  onReject: () => Promise<void>
  loading?: boolean
}

export function ReviewCard({ karte, current, total, onPrev, onNext, onAccept, onReject, loading }: Props) {
  const [edits, setEdits] = useState<Partial<Karte>>({})
  const hasEdits = Object.keys(edits).length > 0

  useEffect(() => {
    setEdits({})
  }, [karte.id])

  function val<K extends keyof Karte>(key: K): Karte[K] {
    return (key in edits ? edits[key] : karte[key]) as Karte[K]
  }

  function set<K extends keyof Karte>(key: K, value: Karte[K]) {
    setEdits((prev) => ({ ...prev, [key]: value }))
  }

  const typ = val('typ') as KartTyp

  return (
    <div className="rounded-lg border bg-card p-6 space-y-5">
      {/* Navigation header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onPrev}
            disabled={current <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums px-1">
            {current} / {total}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onNext}
            disabled={current >= total || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {val('slide_nr') != null && (
            <span className="text-xs text-muted-foreground">Folie {val('slide_nr')}</span>
          )}
          <Select
            value={typ}
            onValueChange={(v) => set('typ', v as KartTyp)}
            disabled={loading}
          >
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="cloze">Cloze</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Slide image */}
      {karte.image_b64 && (
        <img
          src={`data:image/jpeg;base64,${karte.image_b64}`}
          alt="Folienbild"
          className="w-full max-h-52 object-contain rounded border"
        />
      )}

      {/* Content fields */}
      {typ === 'basic' ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`frage-${karte.id}`}>Frage</Label>
            <Textarea
              id={`frage-${karte.id}`}
              value={(val('frage') as string) ?? ''}
              onChange={(e) => set('frage', e.target.value)}
              rows={2}
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`antwort-${karte.id}`}>Antwort</Label>
            <Textarea
              id={`antwort-${karte.id}`}
              value={(val('antwort') as string) ?? ''}
              onChange={(e) => set('antwort', e.target.value)}
              rows={2}
              disabled={loading}
            />
          </div>
        </>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor={`cloze-${karte.id}`}>Lückentext</Label>
          <Textarea
            id={`cloze-${karte.id}`}
            value={(val('cloze_text') as string) ?? ''}
            onChange={(e) => set('cloze_text', e.target.value)}
            rows={3}
            disabled={loading}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Syntax: {'{{c1::Antwort}}'} • {'{{c2::Zweite Lücke}}'}
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`kontext-${karte.id}`}>Kontext / Erklärung</Label>
        <Textarea
          id={`kontext-${karte.id}`}
          value={(val('kontext') as string) ?? ''}
          onChange={(e) => set('kontext', e.target.value || null)}
          rows={2}
          disabled={loading}
          placeholder="Optional: Zusätzlicher Kontext..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`tags-${karte.id}`}>Tags (kommagetrennt)</Label>
          <Input
            id={`tags-${karte.id}`}
            value={((val('tags') as string[]) ?? []).join(', ')}
            onChange={(e) =>
              set(
                'tags',
                e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
              )
            }
            disabled={loading}
            placeholder="definition, formel, ..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`slide-${karte.id}`}>Folien-Nr.</Label>
          <Input
            id={`slide-${karte.id}`}
            type="number"
            value={(val('slide_nr') as number | null) ?? ''}
            onChange={(e) => set('slide_nr', e.target.value ? Number(e.target.value) : null)}
            disabled={loading}
            min={1}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          onClick={onReject}
          disabled={loading}
          className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verwerfen'}
        </Button>
        <Button
          onClick={() => onAccept(edits)}
          disabled={loading}
          className="flex-[2]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : hasEdits ? (
            'Editieren & Übernehmen'
          ) : (
            'Übernehmen'
          )}
        </Button>
      </div>
    </div>
  )
}
