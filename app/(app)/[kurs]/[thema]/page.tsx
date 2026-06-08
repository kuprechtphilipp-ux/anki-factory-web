'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ReviewCard } from '@/components/review-card'
import { KarteListItem } from '@/components/karte-list-item'
import { toast } from 'sonner'
import { Loader2, Upload, FileText, ArrowRight, Brain } from 'lucide-react'
import Link from 'next/link'
import type { Karte } from '@/lib/types'

interface Props {
  params: { kurs: string; thema: string }
}

export default function ThemaPage({ params }: Props) {
  const kursName = decodeURIComponent(params.kurs)
  const themaName = decodeURIComponent(params.thema)

  const [themaId, setThemaId] = useState<number | null>(null)
  const [loadingThema, setLoadingThema] = useState(true)
  const [activeTab, setActiveTab] = useState('generieren')

  // ── Generieren ──
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [batchSize, setBatchSize] = useState(5)
  const [lod, setLod] = useState('Mittel')
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [lastGenCount, setLastGenCount] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Review ──
  const [reviewKarten, setReviewKarten] = useState<Karte[]>([])
  const [reviewIdx, setReviewIdx] = useState(0)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // ── Alle Karten ──
  const [alleKarten, setAlleKarten] = useState<Karte[]>([])
  const [alleLoading, setAlleLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('alle')

  // ── Statistik ──
  const [dueCount, setDueCount] = useState<number | null>(null)

  // Load thema_id on mount
  useEffect(() => {
    async function load() {
      const { data: kursRow } = await supabase
        .from('kurs')
        .select('id')
        .eq('name', kursName)
        .single()
      if (!kursRow) { setLoadingThema(false); return }

      const { data: themaRow } = await supabase
        .from('thema')
        .select('id')
        .eq('kurs_id', kursRow.id)
        .eq('name', themaName)
        .single()

      if (themaRow) {
        setThemaId(themaRow.id)
        // Load due count
        fetch(`/api/karten?thema_id=${themaRow.id}&status=reviewed&due=true`)
          .then((r) => r.json())
          .then((data: Karte[]) => setDueCount(data.length))
          .catch(() => {})
      }
      setLoadingThema(false)
    }
    load()
  }, [kursName, themaName])

  // Load review karten when tab is active
  useEffect(() => {
    if (activeTab === 'review' && themaId != null) {
      setReviewLoading(true)
      fetch(`/api/karten?thema_id=${themaId}&status=neu`)
        .then((r) => r.json())
        .then((data: Karte[]) => {
          setReviewKarten(data)
          setReviewIdx(0)
          setReviewLoading(false)
        })
        .catch(() => setReviewLoading(false))
    }
  }, [activeTab, themaId])

  // Load alle karten when tab is active or filter changes
  useEffect(() => {
    if (activeTab === 'alle' && themaId != null) {
      setAlleLoading(true)
      const url =
        statusFilter === 'alle'
          ? `/api/karten?thema_id=${themaId}`
          : `/api/karten?thema_id=${themaId}&status=${statusFilter}`
      fetch(url)
        .then((r) => r.json())
        .then((data: Karte[]) => {
          setAlleKarten(data)
          setAlleLoading(false)
        })
        .catch(() => setAlleLoading(false))
    }
  }, [activeTab, themaId, statusFilter])

  // Fake progress animation during generation
  useEffect(() => {
    if (!generating) { setGenProgress(0); return }
    setGenProgress(5)
    const interval = setInterval(() => {
      setGenProgress((prev) => (prev < 88 ? prev + 3 : prev))
    }, 800)
    return () => clearInterval(interval)
  }, [generating])

  // ── Handlers ──

  async function handleGenerieren() {
    if (!pdfFile || themaId == null) return
    setGenerating(true)
    setLastGenCount(null)

    try {
      const form = new FormData()
      form.append('pdf', pdfFile)
      form.append('thema_id', String(themaId))
      form.append('lod', lod)
      form.append('batch_size', String(batchSize))

      const res = await fetch('/api/generieren', { method: 'POST', body: form })
      const json = await res.json()

      if (!res.ok || json.error) {
        toast.error(json.error ?? 'Fehler bei der Generierung')
        return
      }

      const { karten, count } = json as { karten: Partial<Karte>[]; count: number }

      if (count === 0) {
        toast.warning('Keine Karten generiert – PDF möglicherweise leer.')
        return
      }

      const saveRes = await fetch('/api/karten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(karten),
      })

      if (!saveRes.ok) {
        toast.error('Karten generiert, aber Speichern fehlgeschlagen.')
        return
      }

      setGenProgress(100)
      setLastGenCount(count)
      setPdfFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success(`${count} Karten generiert und gespeichert`)
    } catch {
      toast.error('Unbekannter Fehler')
    } finally {
      setGenerating(false)
    }
  }

  async function handleAccept(updates: Partial<Karte>) {
    const karte = reviewKarten[reviewIdx]
    setActionLoading(true)
    try {
      const res = await fetch(`/api/karte/${karte.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, status: 'reviewed' }),
      })
      if (!res.ok) { toast.error('Fehler beim Speichern'); return }
      toast.success('Karte übernommen')
      const next = reviewKarten.filter((_, i) => i !== reviewIdx)
      setReviewKarten(next)
      setReviewIdx(Math.max(0, Math.min(reviewIdx, next.length - 1)))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject() {
    const karte = reviewKarten[reviewIdx]
    setActionLoading(true)
    try {
      const res = await fetch(`/api/karte/${karte.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'verworfen' }),
      })
      if (!res.ok) { toast.error('Fehler beim Verwerfen'); return }
      toast.success('Karte verworfen')
      const next = reviewKarten.filter((_, i) => i !== reviewIdx)
      setReviewKarten(next)
      setReviewIdx(Math.max(0, Math.min(reviewIdx, next.length - 1)))
    } finally {
      setActionLoading(false)
    }
  }

  // ── Render ──

  if (loadingThema) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Lade Thema...</span>
      </div>
    )
  }

  if (!themaId) {
    return (
      <div className="text-destructive">
        Thema &quot;{themaName}&quot; wurde nicht gefunden.
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{kursName}</p>
      <h1 className="text-2xl font-bold mb-6">{themaName}</h1>

      {/* Statistik-Widget */}
      {dueCount != null && dueCount > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {dueCount} {dueCount === 1 ? 'Karte fällig' : 'Karten fällig'}
            </span>
            <span className="text-blue-600 dark:text-blue-400 text-xs">heute</span>
          </div>
          <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8">
            <Link href={`/${encodeURIComponent(kursName)}/${encodeURIComponent(themaName)}/lernen`}>
              <Brain className="mr-1.5 h-3.5 w-3.5" />
              Lernen
            </Link>
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="generieren">Generieren</TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5">
            Review
            {reviewKarten.length > 0 && (
              <Badge className="h-4 px-1 text-[10px]">{reviewKarten.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alle">Alle Karten</TabsTrigger>
        </TabsList>

        {/* ── Tab: Generieren ── */}
        <TabsContent value="generieren" className="mt-6 max-w-lg space-y-6">
          {/* PDF Upload */}
          <div className="space-y-2">
            <Label>PDF hochladen</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {pdfFile ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">{pdfFile.name}</span>
                  <span className="text-muted-foreground">
                    ({(pdfFile.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Klicken oder PDF hierher ziehen
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {/* Detailgrad */}
          <div className="space-y-2">
            <Label>Detailgrad</Label>
            <Select value={lod} onValueChange={setLod} disabled={generating}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gering">
                  <div>
                    <div className="font-medium">Gering</div>
                    <div className="text-xs text-muted-foreground">
                      Pareto 80/20 – nur die wichtigsten Konzepte
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="Mittel">
                  <div>
                    <div className="font-medium">Mittel</div>
                    <div className="text-xs text-muted-foreground">
                      Gute Balance aus Details und Übersicht
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="Hoch">
                  <div>
                    <div className="font-medium">Hoch</div>
                    <div className="text-xs text-muted-foreground">
                      Jedes Detail – maximale Kartenanzahl
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Batch Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Folien pro Batch</Label>
              <span className="text-sm font-medium tabular-nums">{batchSize}</span>
            </div>
            <Slider
              value={[batchSize]}
              onValueChange={([v]) => setBatchSize(v)}
              min={1}
              max={10}
              step={1}
              disabled={generating}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Weniger Folien pro Batch = genauere Karten, mehr API-Calls.
            </p>
          </div>

          {/* Progress */}
          {generating && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generiere Flashcards mit Claude...</span>
              </div>
              <Progress value={genProgress} className="h-1.5" />
            </div>
          )}

          {/* Success state */}
          {lastGenCount != null && !generating && (
            <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3 text-sm">
              <span>
                <span className="font-medium">{lastGenCount}</span> Karten gespeichert
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => setActiveTab('review')}
              >
                Zum Review
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <Button
            onClick={handleGenerieren}
            disabled={!pdfFile || generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generiere...
              </>
            ) : (
              'Flashcards generieren'
            )}
          </Button>
        </TabsContent>

        {/* ── Tab: Review ── */}
        <TabsContent value="review" className="mt-6 max-w-2xl">
          {reviewLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Lade Karten...</span>
            </div>
          ) : reviewKarten.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <p className="text-lg font-medium">Keine Karten zu reviewen</p>
              <p className="text-sm">
                Generiere zuerst Karten oder alle neuen Karten wurden bereits überprüft.
              </p>
            </div>
          ) : (
            <ReviewCard
              karte={reviewKarten[reviewIdx]}
              current={reviewIdx + 1}
              total={reviewKarten.length}
              onPrev={() => setReviewIdx((i) => Math.max(0, i - 1))}
              onNext={() => setReviewIdx((i) => Math.min(reviewKarten.length - 1, i + 1))}
              onAccept={handleAccept}
              onReject={handleReject}
              loading={actionLoading}
            />
          )}
        </TabsContent>

        {/* ── Tab: Alle Karten ── */}
        <TabsContent value="alle" className="mt-6 max-w-2xl space-y-4">
          {/* Filter */}
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
            {!alleLoading && (
              <span className="text-sm text-muted-foreground">
                {alleKarten.length} Karte{alleKarten.length !== 1 ? 'n' : ''}
              </span>
            )}
          </div>

          {/* List */}
          {alleLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Lade Karten...</span>
            </div>
          ) : alleKarten.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm">Keine Karten gefunden.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alleKarten.map((karte) => (
                <KarteListItem key={karte.id} karte={karte} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
