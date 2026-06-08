'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'
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
}

export function KarteListItem({ karte }: Props) {
  const [open, setOpen] = useState(false)

  const preview = karte.typ === 'cloze'
    ? (karte.cloze_text ?? '')
    : karte.frage

  return (
    <div className={cn('rounded-lg border transition-colors', open && 'bg-muted/20')}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 p-4 text-left"
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
            {karte.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs h-5">{tag}</Badge>
            ))}
            {karte.slide_nr != null && (
              <span className="text-xs text-muted-foreground">Folie {karte.slide_nr}</span>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 text-sm border-t pt-3 ml-7">
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
        </div>
      )}
    </div>
  )
}
