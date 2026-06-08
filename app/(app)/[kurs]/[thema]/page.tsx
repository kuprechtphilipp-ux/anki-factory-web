'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { ReviewCard } from '@/components/review-card'
import { KarteListItem } from '@/components/karte-list-item'
import { toast } from 'sonner'
import { Loader2, Upload, FileText, ArrowRight, Brain, Sparkles, Zap, BookOpen } from 'lucide-react'
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

  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [batchSize, setBatchSize] = useState(5)
  const [lod, setLod] = useState('Mittel')
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [lastGenCount, setLastGenCount] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [reviewKarten, setReviewKarten] = useState<Karte[]>([])
  const [reviewIdx, setReviewIdx] = useState(0)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [alleKarten, setAlleKarten] = useState<Karte[]>([])
  const [alleLoading, setAlleLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('alle')

  const [dueCount, setDueCount] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const { data: kursRow } = await supabase
        .from('kurs').select('id').eq('name', kursName).single()
      if (!kursRow) { setLoadingThema(false); return }

      const { data: themaRow } = await supabase
        .from('thema').select('id').eq('kurs_id', kursRow.id).eq('name', themaName).single()

      if (themaRow) {
        setThemaId(themaRow.id)
        fetch(`/api/karten?thema_id=${themaRow.id}&status=reviewed&due=true`)
          .then((r) => r.json())
          .then((data: Karte[]) => setDueCount(data.length))
          .catch(() => {})
      }
      setLoadingThema(false)
    }
    load()
  }, [kursName, themaName])

  useEffect(() => {
    if (activeTab === 'review' && themaId != null) {
      setReviewLoading(true)
      fetch(`/api/karten?thema_id=${themaId}&status=neu`)
        .then((r) => r.json())
        .then((data: Karte[]) => { setReviewKarten(data); setReviewIdx(0); setReviewLoading(false) })
        .catch(() => setReviewLoading(false))
    }
  }, [activeTab, themaId])

  useEffect(() => {
    if (activeTab === 'alle' && themaId != null) {
      setAlleLoading(true)
      const url = statusFilter === 'alle'
        ? `/api/karten?thema_id=${themaId}`
        : `/api/karten?thema_id=${themaId}&status=${statusFilter}`
      fetch(url)
        .then((r) => r.json())
        .then((data: Karte[]) => { setAlleKarten(data); setAlleLoading(false) })
        .catch(() => setAlleLoading(false))
    }
  }, [activeTab, themaId, statusFilter])

  useEffect(() => {
    if (!generating) { setGenProgress(0); return }
    setGenProgress(5)
    const interval = setInterval(() => {
      setGenProgress((prev) => (prev < 88 ? prev + 3 : prev))
    }, 800)
    return () => clearInterval(interval)
  }, [generating])

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

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 90_000)
      let res: Response
      try {
        res = await fetch('/api/generieren', { method: 'POST', body: form, signal: controller.signal })
      } finally {
        clearTimeout(timeout)
      }
      const json = await res.json()
      if (!res.ok || json.error) { toast.error(json.error ?? 'Fehler bei der Generierung'); return }

      const { karten, count } = json as { karten: Partial<Karte>[]; count: number }
      if (count === 0) { toast.warning('Keine Karten generiert – PDF möglicherweise leer.'); return }

      const saveRes = await fetch('/api/karten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(karten),
      })
      if (!saveRes.ok) { toast.error('Karten generiert, aber Speichern fehlgeschlagen.'); return }

      setGenProgress(100)
      setLastGenCount(count)
      setPdfFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success(`${count} Karten generiert und gespeichert`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unbekannter Fehler')
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

  if (loadingThema) {
    return (
      <div className="flex items-center gap-2.5 text-muted-foreground py-12">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Lade Thema...</span>
      </div>
    )
  }

  if (!themaId) {
    return (
      <div className="py-12 text-destructive text-sm">
        Thema &quot;{themaName}&quot; wurde nicht gefunden.
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb + Title */}
      <div className="mb-7">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">{kursName}</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight">{themaName}</h1>
      </div>

      {/* Due-Karten Banner */}
      {dueCount != null && dueCount > 0 && (
        <div className="mb-7 relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-violet-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                <Brain className="h-4.5 w-4.5 h-[18px] w-[18px] text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {dueCount} {dueCount === 1 ? 'Karte fällig' : 'Karten fällig'}
                </p>
                <p className="text-xs text-muted-foreground">Heute wiederholen</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" className="gap-1.5 h-8 shadow-sm">
                <Link href={`/${encodeURIComponent(kursName)}/${encodeURIComponent(themaName)}/lernen`}>
                  <BookOpen className="h-3.5 w-3.5" />
                  Lernen
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="gap-1.5 h-8">
                <Link href={`/${encodeURIComponent(kursName)}/${encodeURIComponent(themaName)}/drill`}>
                  <Zap className="h-3.5 w-3.5" />
                  Drill
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 rounded-lg bg-muted p-1 gap-0.5">
          <TabsTrigger
            value="generieren"
            className="rounded-md px-4 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            Generieren
          </TabsTrigger>
          <TabsTrigger
            value="review"
            className="rounded-md px-4 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm gap-1.5"
          >
            Review
            {reviewKarten.length > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold">
                {reviewKarten.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="alle"
            className="rounded-md px-4 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            Alle Karten
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Generieren ── */}
        <TabsContent value="generieren" className="mt-6 max-w-lg space-y-5">
          {/* PDF Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PDF hochladen</Label>
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-primary bg-gradient-to-b from-primary/10 to-transparent'
                  : pdfFile
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-gradient-to-b hover:from-primary/5 hover:to-transparent'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const file = e.dataTransfer.files[0]
                if (file?.type === 'application/pdf') {
                  if (file.size > 20 * 1024 * 1024) {
                    toast.error('PDF zu groß (max. 20 MB). Bitte in kleinere Abschnitte aufteilen.')
                    return
                  }
                  setPdfFile(file)
                }
              }}
            >
              {pdfFile ? (
                <div className="flex items-center justify-center gap-2.5 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{pdfFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-muted">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">PDF hier ablegen</p>
                    <p className="text-xs text-muted-foreground mt-0.5">oder klicken zum Auswählen</p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  if (file && file.size > 20 * 1024 * 1024) {
                    toast.error('PDF zu groß (max. 20 MB). Bitte in kleinere Abschnitte aufteilen.')
                    e.target.value = ''
                    return
                  }
                  setPdfFile(file)
                }}
              />
            </div>
          </div>

          {/* Settings row */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detailgrad</Label>
              <Select value={lod} onValueChange={setLod} disabled={generating}>
                <SelectTrigger className="h-9 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gering">
                    <div className="py-0.5">
                      <div className="font-medium">Gering</div>
                      <div className="text-xs text-muted-foreground">Pareto 80/20</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="Mittel">
                    <div className="py-0.5">
                      <div className="font-medium">Mittel</div>
                      <div className="text-xs text-muted-foreground">Balance</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="Hoch">
                    <div className="py-0.5">
                      <div className="font-medium">Hoch</div>
                      <div className="text-xs text-muted-foreground">Alles</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Batch-Größe</Label>
                <span className="text-sm font-semibold tabular-nums text-primary">{batchSize}</span>
              </div>
              <div className="pt-2">
                <Slider
                  value={[batchSize]}
                  onValueChange={([v]) => setBatchSize(v)}
                  min={1} max={10} step={1}
                  disabled={generating}
                  className="w-full"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Folien pro API-Call</p>
            </div>
          </div>

          {/* Progress */}
          {generating && (
            <div className="space-y-2 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-primary">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                <span>Generiere Flashcards mit Claude AI...</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-all duration-700"
                  style={{ width: `${genProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success */}
          {lastGenCount != null && !generating && (
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm animate-fade-in">
              <span className="text-emerald-800 dark:text-emerald-200">
                <span className="font-semibold">{lastGenCount}</span> Karten gespeichert
              </span>
              <Button variant="ghost" size="sm" className="gap-1 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800" onClick={() => setActiveTab('review')}>
                Zum Review
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <Button
            onClick={handleGenerieren}
            disabled={!pdfFile || generating}
            className="w-full h-10 gap-2 shadow-sm"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generiere...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Flashcards generieren
              </>
            )}
          </Button>
        </TabsContent>

        {/* ── Tab: Review ── */}
        <TabsContent value="review" className="mt-6 max-w-2xl">
          {reviewLoading ? (
            <div className="flex items-center gap-2.5 text-muted-foreground py-12">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Lade Karten...</span>
            </div>
          ) : reviewKarten.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-base font-medium mt-4">Keine Karten zu reviewen</p>
              <p className="text-sm text-muted-foreground">
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
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Status</SelectItem>
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

          {alleLoading ? (
            <div className="flex items-center gap-2.5 text-muted-foreground py-12">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Lade Karten...</span>
            </div>
          ) : alleKarten.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Keine Karten gefunden.</p>
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
