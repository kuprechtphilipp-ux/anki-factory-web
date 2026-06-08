'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { KarteListItem } from '@/components/karte-list-item'
import { Loader2 } from 'lucide-react'
import type { Karte } from '@/lib/types'

interface Props {
  params: { kurs: string; thema: string }
}

export default function AlleKartenPage({ params }: Props) {
  const kursName = decodeURIComponent(params.kurs)
  const themaName = decodeURIComponent(params.thema)

  const [themaId, setThemaId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [karten, setKarten] = useState<Karte[]>([])
  const [statusFilter, setStatusFilter] = useState('alle')

  useEffect(() => {
    async function loadThema() {
      const { data: kursRow } = await supabase
        .from('kurs').select('id').eq('name', kursName).single()
      if (!kursRow) { setLoading(false); return }

      const { data: themaRow } = await supabase
        .from('thema').select('id').eq('kurs_id', kursRow.id).eq('name', themaName).single()
      if (themaRow) setThemaId(themaRow.id)
      else setLoading(false)
    }
    loadThema()
  }, [kursName, themaName])

  useEffect(() => {
    if (themaId == null) return
    setLoading(true)
    const url =
      statusFilter === 'alle'
        ? `/api/karten?thema_id=${themaId}`
        : `/api/karten?thema_id=${themaId}&status=${statusFilter}`
    fetch(url)
      .then((r) => r.json())
      .then((data: Karte[]) => { setKarten(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [themaId, statusFilter])

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{kursName}</p>
      <h1 className="text-2xl font-bold mb-6">{themaName} — Alle Karten</h1>

      <div className="max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <Label className="shrink-0">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle</SelectItem>
              <SelectItem value="neu">Neu</SelectItem>
              <SelectItem value="reviewed">Überprüft</SelectItem>
              <SelectItem value="verworfen">Verworfen</SelectItem>
              <SelectItem value="exportiert">Exportiert</SelectItem>
            </SelectContent>
          </Select>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              {karten.length} Karte{karten.length !== 1 ? 'n' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Lade Karten...</span>
          </div>
        ) : karten.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-sm">Keine Karten gefunden.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {karten.map((karte) => (
              <KarteListItem key={karte.id} karte={karte} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
