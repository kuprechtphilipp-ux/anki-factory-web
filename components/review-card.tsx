'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Check, X, Loader2 } from 'lucide-react'
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

  useEffect(() => { setEdits({}) }, [karte.id])

  function val<K extends keyof Karte>(key: K): Karte[K] {
    return (key in edits ? edits[key] : karte[key]) as Karte[K]
  }

  function set<K extends keyof Karte>(key: K, value: Karte[K]) {
    setEdits((prev) => ({ ...prev, [key]: value }))
  }

  const typ = val('typ') as KartTyp

  return (
    <div className="rounded-xl bg-card shadow-card border border-border/50 overflow-hidden">
      {/* Navigation header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md"
            onClick={onPrev}
            disabled={current <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums px-2 font-medium">
            {current} / {total}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md"
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
            <SelectTrigger className="h-7 w-24 text-xs rounded-md">
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
        <div className="border-b border-border/50 px-5 py-4 bg-muted/20">
          <img
            src={`data:image/jpeg;base64,${karte.image_b64}`}
            alt="Folienbild"
            className="w-full max-h-52 object-contain rounded-lg"
          />
        </div>
      )}

      {/* Content fields */}
      <div className="px-5 py-5 space-y-4">
        {typ === 'basic' ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Frage</Label>
              <Textarea
                value={(val('frage') as string) ?? ''}
                onChange={(e) => set('frage', e.target.value)}
                rows={2}
                disabled={loading}
                className="resize-none bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Antwort</Label>
              <div className="rounded-lg bg-muted/50 border border-border/50 overflow-hidden">
                <Textarea
                  value={(val('antwort') as string) ?? ''}
                  onChange={(e) => set('antwort', e.target.value)}
                  rows={2}
                  disabled={loading}
                  className="resize-none bg-transparent border-0 focus-visible:ring-0"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lückentext</Label>
            <Textarea
              value={(val('cloze_text') as string) ?? ''}
              onChange={(e) => set('cloze_text', e.target.value)}
              rows={3}
              disabled={loading}
              className="resize-none font-mono text-sm bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Syntax: {'{{c1::Antwort}}'} • {'{{c2::Zweite Lücke}}'}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kontext</Label>
          <Textarea
            value={(val('kontext') as string) ?? ''}
            onChange={(e) => set('kontext', e.target.value || null)}
            rows={2}
            disabled={loading}
            placeholder="Optional: Zusätzlicher Kontext..."
            className="resize-none bg-background"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</Label>
            <Input
              value={((val('tags') as string[]) ?? []).join(', ')}
              onChange={(e) =>
                set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))
              }
              disabled={loading}
              placeholder="definition, formel, ..."
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Folie</Label>
            <Input
              type="number"
              value={(val('slide_nr') as number | null) ?? ''}
              onChange={(e) => set('slide_nr', e.target.value ? Number(e.target.value) : null)}
              disabled={loading}
              min={1}
              className="bg-background"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-5 pb-5">
        <Button
          variant="outline"
          onClick={onReject}
          disabled={loading}
          className="flex-1 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><X className="h-4 w-4" />Verwerfen</>}
        </Button>
        <Button
          onClick={() => onAccept(edits)}
          disabled={loading}
          className="flex-[2] gap-1.5 shadow-sm"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <><Check className="h-4 w-4" />{hasEdits ? 'Editieren & Übernehmen' : 'Übernehmen'}</>
          )}
        </Button>
      </div>
    </div>
  )
}
