'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { ReviewCard } from '@/components/review-card'
import { KarteListItem } from '@/components/karte-list-item'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Upload, FileText, ArrowRight, Brain, Sparkles, Zap, BookOpen, Search, CheckCheck, X, Plus, PenLine, ChevronLeft, ChevronRight, ArrowLeft, List, ScanSearch, Wand2, ChevronDown, ChevronUp, Layers, AlertTriangle, Eye } from 'lucide-react'
import Link from 'next/link'
import { FeedbackModal } from '@/components/feedback-modal'
import { FactoryLoader } from '@/components/factory-loader'
import type { Karte, KartTyp, PrescanResult, PrescanBatch } from '@/lib/types'

const PAGE_SIZE = 20

interface Props {
  params: { kurs: string; thema: string }
}

export default function ThemaPage({ params }: Props) {
  const kursName = decodeURIComponent(params.kurs)
  const themaName = decodeURIComponent(params.thema)

  const [themaId, setThemaId] = useState<number | null>(null)
  const [loadingThema, setLoadingThema] = useState(true)
  const [activeTab, setActiveTab] = useState('uebersicht')

  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [batchSize, setBatchSize] = useState(20)
  const [clozeMix, setClozeMix] = useState(50)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [lastGenCount, setLastGenCount] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pageFrom, setPageFrom] = useState('')
  const [pageTo, setPageTo] = useState('')

  const [reviewKarten, setReviewKarten] = useState<Karte[]>([])
  const [reviewIdx, setReviewIdx] = useState(0)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const [alleKarten, setAlleKarten] = useState<Karte[]>([])
  const [alleLoading, setAlleLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('alle')
  const [searchQuery, setSearchQuery] = useState('')
  const [alleKartenPage, setAlleKartenPage] = useState(1)

  // Manual card creation
  const [newTyp, setNewTyp] = useState<KartTyp>('basic')
  const [newFrage, setNewFrage] = useState('')
  const [newAntwort, setNewAntwort] = useState('')
  const [newCloze, setNewCloze] = useState('')
  const [newKontext, setNewKontext] = useState('')
  const [newTags, setNewTags] = useState('')
  const [creatingKarte, setCreatingKarte] = useState(false)

  // Pre-scan state
  const [scanStep, setScanStep] = useState<'idle' | 'scanning' | 'result'>('idle')
  const [scanResult, setScanResult] = useState<PrescanResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [activeBatchIdx, setActiveBatchIdx] = useState<number | null>(null)
  const [autoBatchRunning, setAutoBatchRunning] = useState(false)
  const [autoBatchCurrent, setAutoBatchCurrent] = useState(0)
  const [autoBatchTotal, setAutoBatchTotal] = useState(0)
  const [currentBatchLabel, setCurrentBatchLabel] = useState<string | undefined>()
  const [currentBatchPagesFrom, setCurrentBatchPagesFrom] = useState<number | undefined>()
  const [currentBatchPagesTo, setCurrentBatchPagesTo] = useState<number | undefined>()
  const [currentBatchTargetCards, setCurrentBatchTargetCards] = useState<number | undefined>()

  const [visionMode, setVisionMode] = useState(false)
  const [completedBatches, setCompletedBatches] = useState<Set<number>>(() => new Set<number>())

  // Feedback modal state
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [lastGenLod, setLastGenLod] = useState('Mittel')
  const [selectedConcepts, setSelectedConcepts] = useState<Record<string, boolean>>({})
  const [priorityFilter, setPriorityFilter] = useState<'alle' | 'core' | 'detail' | 'fokus'>('alle')

  const activeReviewKarten = reviewKarten.filter(k => {
    if (priorityFilter === 'alle') return true
    if (priorityFilter === 'fokus') return k.tags?.includes('fokus')
    if (priorityFilter === 'core') return k.tags?.includes('core')
    if (priorityFilter === 'detail') return k.tags?.includes('detail')
    return true
  })

  useEffect(() => {
    if (activeReviewKarten.length > 0 && reviewIdx >= activeReviewKarten.length) {
      setReviewIdx(activeReviewKarten.length - 1)
    }
  }, [activeReviewKarten.length, reviewIdx])

  const [dueCount, setDueCount] = useState<number | null>(null)
  const [neuCount, setNeuCount] = useState<number | null>(null)
  const [reviewedCount, setReviewedCount] = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const { data: kursRow } = await supabase
        .from('kurs').select('id').eq('name', kursName).single()
      if (!kursRow) { setLoadingThema(false); return }

      const { data: themaRow } = await supabase
        .from('thema').select('id').eq('kurs_id', kursRow.id).eq('name', themaName).single()

      if (themaRow) {
        setThemaId(themaRow.id)
        const tid = themaRow.id
        Promise.all([
          fetch(`/api/karten?thema_id=${tid}&status=reviewed&due=true`).then(r => r.json()),
          fetch(`/api/karten?thema_id=${tid}&status=neu`).then(r => r.json()),
          fetch(`/api/karten?thema_id=${tid}&status=reviewed`).then(r => r.json()),
        ]).then(([due, neu, reviewed]: [Karte[], Karte[], Karte[]]) => {
          setDueCount(due.length)
          setNeuCount(neu.length)
          setReviewedCount(reviewed.length)
        }).catch(() => {})
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

  async function handlePrescan() {
    if (!pdfFile) return
    setScanStep('scanning')
    setScanError(null)
    setScanResult(null)
    try {
      const form = new FormData()
      form.append('pdf', pdfFile)
      const res = await fetch('/api/prescan', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok || json.error) {
        setScanError(json.error ?? 'Pre-Scan fehlgeschlagen')
        setScanStep('idle')
        return
      }
      const data = json as PrescanResult
      setScanResult(data)
      // Pre-fill settings from recommendation
      setClozeMix(data.empfehlung.cloze_anteil)
      setBatchSize(data.empfehlung.kartenmenge)

      // Initialize selected concepts
      const initialSelected: Record<string, boolean> = {}
      data.batches?.forEach((batch: PrescanBatch, bIdx: number) => {
        batch.schluesselkonzepte?.forEach((_, cIdx: number) => {
          initialSelected[`${bIdx}_${cIdx}`] = true
        })
      })
      setSelectedConcepts(initialSelected)

      setScanStep('result')
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Unbekannter Fehler')
      setScanStep('idle')
    }
  }

  function handlePrescanBatchStart(batch: PrescanBatch, idx: number) {
    setActiveBatchIdx(idx)
    setCurrentBatchLabel(batch.label)
    setCurrentBatchPagesFrom(batch.von)
    setCurrentBatchPagesTo(batch.bis)
    handleGenerieren(String(batch.von), String(batch.bis), true, idx)
  }

  async function handleAlleGenerieren() {
    if (!pdfFile || themaId == null || !scanResult) return
    const batches = scanResult.batches
    setAutoBatchRunning(true)
    setAutoBatchTotal(batches.length)
    let totalCount = 0
    try {
      const prescanTotal = scanResult.empfehlung.kartenmenge
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const concepts = batch.schluesselkonzepte ?? []
        const activeConcepts = concepts.filter((_, cIdx) => selectedConcepts[`${i}_${cIdx}`] !== false)
        if (activeConcepts.length === 0) {
          // Skip this batch if no concepts are selected
          continue
        }

        setAutoBatchCurrent(i + 1)
        setActiveBatchIdx(i)
        setCurrentBatchLabel(batch.label)
        setCurrentBatchPagesFrom(batch.von)
        setCurrentBatchPagesTo(batch.bis)

        const baseRatio = prescanTotal > 0 ? batch.karten / prescanTotal : 1 / batches.length
        const baseBatchCards = Math.max(1, Math.round(batchSize * baseRatio))
        const adjustedBatchCards = Math.max(1, Math.round(baseBatchCards * (activeConcepts.length / concepts.length)))
        setCurrentBatchTargetCards(adjustedBatchCards)

        const count = await runGenerieren(String(batch.von), String(batch.bis), adjustedBatchCards, activeConcepts)
        if (count === null) return
        totalCount += count
        if (batches.length > 1) toast.success(`Batch ${i + 1}/${batches.length}: ${count} Karten gespeichert`)
      }
      setLastGenCount(totalCount)
      setLastGenLod(`${clozeMix}% Cloze`)
      setPdfFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      resetPrescan()
      toast.success(`Generierung fertig · ${totalCount} Karten total`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unbekannter Fehler beim Auto-Generieren')
    } finally {
      setAutoBatchRunning(false)
      setActiveBatchIdx(null)
    }
  }

  function resetPrescan() {
    setScanStep('idle')
    setScanResult(null)
    setScanError(null)
    setSettingsExpanded(false)
    setActiveBatchIdx(null)
    setAutoBatchRunning(false)
    setAutoBatchCurrent(0)
    setAutoBatchTotal(0)
    setCompletedBatches(new Set<number>())
    setSelectedConcepts({})
  }

  function toggleConcept(bIdx: number, cIdx: number) {
    const key = `${bIdx}_${cIdx}`
    setSelectedConcepts(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Core generation logic — returns card count or null on error, throws on network/timeout
  async function runGenerieren(
    overrideFrom?: string, 
    overrideTo?: string, 
    overrideBatchSize?: number,
    conceptsList?: string[]
  ): Promise<number | null> {
    if (!pdfFile || themaId == null) return null
    const from = overrideFrom ?? pageFrom
    const to = overrideTo ?? pageTo
    const form = new FormData()
    form.append('pdf', pdfFile)
    form.append('thema_id', String(themaId))
    form.append('cloze_anteil', String(clozeMix))
    form.append('batch_size', String(overrideBatchSize ?? batchSize))
    form.append('vision', visionMode ? 'true' : 'false')
    if (from) form.append('page_from', from)
    if (to) form.append('page_to', to)
    if (conceptsList && conceptsList.length > 0) {
      form.append('concepts', JSON.stringify(conceptsList))
    }

    let res: Response
    try {
      res = await fetch('/api/generieren', { method: 'POST', body: form })
    } catch (fetchErr) {
      const msg = fetchErr instanceof Error ? fetchErr.message : 'Netzwerkfehler'
      toast.error(`Generierung fehlgeschlagen: ${msg}`)
      return null
    }

    let json: { karten?: Partial<Karte>[]; count?: number; error?: string }
    try {
      json = await res.json()
    } catch {
      toast.error('Ungültige Antwort vom Server (kein JSON)')
      return null
    }

    if (!res.ok || json.error) {
      toast.error(json.error ?? `Serverfehler ${res.status}`)
      return null
    }
    const { karten, count } = json as { karten: Partial<Karte>[]; count: number }
    if (!count || count === 0) { toast.warning('Keine Karten generiert – PDF möglicherweise leer.'); return 0 }
    const saveRes = await fetch('/api/karten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(karten),
    })
    if (!saveRes.ok) { toast.error('Karten generiert, aber Speichern fehlgeschlagen.'); return null }
    return count
  }

  async function handleGenerieren(overrideFrom?: string, overrideTo?: string, isPrescanBatch = false, batchIdx?: number) {
    if (!pdfFile || themaId == null) return
    const from = overrideFrom ?? pageFrom
    const to = overrideTo ?? pageTo
    if (from && parseInt(from) < 1) { toast.error('"Von Seite" muss ≥ 1 sein'); return }
    if (to && parseInt(to) < 1) { toast.error('"Bis Seite" muss ≥ 1 sein'); return }
    if (from && to && parseInt(from) > parseInt(to)) { toast.error('"Von Seite" muss ≤ "Bis Seite" sein'); return }
    setGenerating(true)
    setLastGenCount(null)
    try {
      // Use prescan's per-batch card recommendation, scaled to the user's total budget
      let perBatchSize = batchSize
      let activeConcepts: string[] | undefined = undefined
      if (isPrescanBatch && scanResult && scanResult.batches.length > 0 && batchIdx !== undefined) {
        const batch = scanResult.batches[batchIdx]
        const concepts = batch.schluesselkonzepte ?? []
        activeConcepts = concepts.filter((_, cIdx) => selectedConcepts[`${batchIdx}_${cIdx}`] !== false)
        
        const prescanTotal = scanResult.empfehlung.kartenmenge
        const baseRatio = prescanTotal > 0 ? batch.karten / prescanTotal : 1 / scanResult.batches.length
        const baseBatchCards = Math.max(1, Math.round(batchSize * baseRatio))
        perBatchSize = activeConcepts.length === 0 ? 0 : Math.max(1, Math.round(baseBatchCards * (activeConcepts.length / concepts.length)))
      }

      if (perBatchSize === 0) {
        toast.warning('Keine Konzepte für diesen Batch ausgewählt.')
        return
      }

      const count = await runGenerieren(overrideFrom, overrideTo, perBatchSize, activeConcepts)
      if (count === null || count === 0) return

      setGenProgress(100)
      setLastGenCount(count)
      setLastGenLod(`${clozeMix}% Cloze`)

      if (isPrescanBatch) {
        // Keep PDF + scan result alive for remaining batches
        if (batchIdx !== undefined) {
          setCompletedBatches(prev => { const next = new Set(prev); next.add(batchIdx!); return next })
        }
        setActiveBatchIdx(null)
        toast.success(`${count} Karten gespeichert`)
      } else {
        setPdfFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        resetPrescan()
        toast.success(`${count} Karten generiert und gespeichert`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unbekannter Fehler')
    } finally {
      setGenerating(false)
    }
  }

  function maybeTriggerFeedback(remaining: number) {
    if (remaining === 0 && lastGenCount != null && lastGenCount > 0) {
      setTimeout(() => setFeedbackOpen(true), 600)
    }
  }

  async function handleAccept(updates: Partial<Karte>) {
    const karte = activeReviewKarten[reviewIdx]
    if (!karte) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/karte/${karte.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, status: 'reviewed' }),
      })
      if (!res.ok) { toast.error('Fehler beim Speichern'); return }
      toast.success('Karte übernommen')
      const next = reviewKarten.filter((k) => k.id !== karte.id)
      setReviewKarten(next)
      
      const filteredNext = activeReviewKarten.filter((k) => k.id !== karte.id)
      setReviewIdx(Math.max(0, Math.min(reviewIdx, filteredNext.length - 1)))
      maybeTriggerFeedback(filteredNext.length)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject() {
    const karte = activeReviewKarten[reviewIdx]
    if (!karte) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/karte/${karte.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'verworfen' }),
      })
      if (!res.ok) { toast.error('Fehler beim Verwerfen'); return }
      toast.success('Karte verworfen')
      const next = reviewKarten.filter((k) => k.id !== karte.id)
      setReviewKarten(next)
      
      const filteredNext = activeReviewKarten.filter((k) => k.id !== karte.id)
      setReviewIdx(Math.max(0, Math.min(reviewIdx, filteredNext.length - 1)))
      maybeTriggerFeedback(filteredNext.length)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleBulkAccept() {
    setActionLoading(true)
    const count = activeReviewKarten.length
    try {
      await Promise.all(
        activeReviewKarten.map((k) =>
          fetch(`/api/karte/${k.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'reviewed' }),
          })
        )
      )
      toast.success(`${count} Karten übernommen`)
      const activeIds = new Set(activeReviewKarten.map((k) => k.id))
      setReviewKarten(prev => prev.filter(k => !activeIds.has(k.id)))
      setReviewIdx(0)
      maybeTriggerFeedback(0)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleBulkReject() {
    setActionLoading(true)
    const count = activeReviewKarten.length
    try {
      await Promise.all(
        activeReviewKarten.map((k) =>
          fetch(`/api/karte/${k.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'verworfen' }),
          })
        )
      )
      toast.success(`${count} Karten verworfen`)
      const activeIds = new Set(activeReviewKarten.map((k) => k.id))
      setReviewKarten(prev => prev.filter(k => !activeIds.has(k.id)))
      setReviewIdx(0)
      maybeTriggerFeedback(0)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCreateKarte() {
    if (themaId == null) return
    if (newTyp === 'basic' && !newFrage.trim()) { toast.error('Frage darf nicht leer sein'); return }
    if (newTyp === 'cloze' && !newCloze.trim()) { toast.error('Lückentext darf nicht leer sein'); return }
    setCreatingKarte(true)
    try {
      const tags = newTags.split(',').map(t => t.trim()).filter(Boolean)
      const body = {
        thema_id: themaId,
        typ: newTyp,
        frage: newTyp === 'basic' ? newFrage.trim() : '',
        antwort: newTyp === 'basic' ? newAntwort.trim() : '',
        cloze_text: newTyp === 'cloze' ? newCloze.trim() : null,
        kontext: newKontext.trim() || null,
        tags,
        status: 'reviewed',
      }
      const res = await fetch('/api/karten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { toast.error('Karte konnte nicht gespeichert werden'); return }
      toast.success('Karte erstellt und direkt ins Deck übernommen')
      setNewFrage(''); setNewAntwort(''); setNewCloze(''); setNewKontext(''); setNewTags('')
    } finally {
      setCreatingKarte(false)
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
      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        themaId={themaId}
        kartenCount={lastGenCount ?? 0}
        lodUsed={lastGenLod}
      />

      {/* Breadcrumb + Title */}
      <div className="mb-7">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">{kursName}</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight">{themaName}</h1>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="h-9 rounded-lg bg-muted p-1 gap-0.5 mb-0 inline-flex w-auto min-w-full sm:w-full flex-nowrap">
            <TabsTrigger
              value="uebersicht"
              className="rounded-md px-3 sm:px-4 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm shrink-0"
            >
              Übersicht
            </TabsTrigger>
            <TabsTrigger
              value="generieren"
              className="rounded-md px-3 sm:px-4 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm shrink-0"
            >
              Generieren
            </TabsTrigger>
            <TabsTrigger
              value="review"
              className="rounded-md px-3 sm:px-4 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm gap-1.5 shrink-0"
            >
              Review
              {neuCount != null && neuCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold">
                  {neuCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="alle"
              className="rounded-md px-3 sm:px-4 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm shrink-0"
            >
              Karten
            </TabsTrigger>
            <TabsTrigger
              value="erstellen"
              className="rounded-md px-3 sm:px-4 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm gap-1.5 shrink-0"
            >
              <PenLine className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Erstellen</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tab: Übersicht ── */}
        <TabsContent value="uebersicht" className="mt-6 max-w-2xl space-y-5">
          {/* Stat row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/50 bg-card p-4 shadow-card">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Fällig heute</p>
              <p className={`text-2xl font-bold tabular-nums ${dueCount && dueCount > 0 ? 'text-primary' : 'text-muted-foreground/40'}`}>
                {dueCount ?? '–'}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4 shadow-card">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Im Review</p>
              <p className={`text-2xl font-bold tabular-nums ${neuCount && neuCount > 0 ? 'text-amber-500' : 'text-muted-foreground/40'}`}>
                {neuCount ?? '–'}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-4 shadow-card">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Im Deck</p>
              <p className="text-2xl font-bold tabular-nums text-muted-foreground">
                {reviewedCount ?? '–'}
              </p>
            </div>
          </div>

          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/${encodeURIComponent(kursName)}/${encodeURIComponent(themaName)}/lernen`}
              className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 hover:border-primary/40 hover:from-primary/15 transition-all shadow-card hover:shadow-card-hover hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 group-hover:bg-primary/25 transition-colors">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                {dueCount != null && dueCount > 0 && (
                  <span className="rounded-full bg-primary text-primary-foreground px-2.5 py-0.5 text-xs font-bold">
                    {dueCount} fällig
                  </span>
                )}
              </div>
              <p className="font-semibold text-foreground">Lernen</p>
              <p className="text-xs text-muted-foreground mt-0.5">Spaced Repetition</p>
            </Link>

            <Link
              href={`/${encodeURIComponent(kursName)}/${encodeURIComponent(themaName)}/drill`}
              className="group relative overflow-hidden rounded-2xl border border-amber-200/50 dark:border-amber-700/30 bg-gradient-to-br from-amber-50/80 via-amber-50/30 to-transparent dark:from-amber-950/20 p-5 hover:border-amber-300/60 transition-all shadow-card hover:shadow-card-hover hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                {reviewedCount != null && reviewedCount > 0 && (
                  <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 text-xs font-medium">
                    {reviewedCount} Karten
                  </span>
                )}
              </div>
              <p className="font-semibold text-foreground">Drill</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ohne Zeitdruck üben</p>
            </Link>
          </div>

          {/* Secondary actions */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setActiveTab('review')}
              className="group rounded-xl border border-border/50 bg-card p-4 text-left hover:border-primary/30 hover:bg-primary/5 transition-all shadow-card hover:-translate-y-0.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted mb-3 group-hover:bg-primary/10 transition-colors">
                <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm font-medium">Review</p>
              {neuCount != null && (
                <p className="text-xs text-muted-foreground mt-0.5">{neuCount} neu</p>
              )}
            </button>

            <button
              onClick={() => setActiveTab('generieren')}
              className="group rounded-xl border border-border/50 bg-card p-4 text-left hover:border-violet-300/50 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 transition-all shadow-card hover:-translate-y-0.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted mb-3 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/30 transition-colors">
                <Sparkles className="h-4 w-4 text-muted-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
              </div>
              <p className="text-sm font-medium">Generieren</p>
              <p className="text-xs text-muted-foreground mt-0.5">PDF → Karten</p>
            </button>

            <button
              onClick={() => setActiveTab('erstellen')}
              className="group rounded-xl border border-border/50 bg-card p-4 text-left hover:border-emerald-300/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all shadow-card hover:-translate-y-0.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted mb-3 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                <PenLine className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              </div>
              <p className="text-sm font-medium">Erstellen</p>
              <p className="text-xs text-muted-foreground mt-0.5">Manuell</p>
            </button>
          </div>

          {/* Alle Karten link */}
          <button
            onClick={() => setActiveTab('alle')}
            className="group flex w-full items-center justify-between rounded-xl border border-border/50 bg-card px-4 py-3 hover:border-primary/20 hover:bg-muted/30 transition-all shadow-card"
          >
            <div className="flex items-center gap-3">
              <List className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Alle Karten durchsuchen</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </button>
        </TabsContent>

        {/* ── Tab: Generieren ── */}
        <TabsContent value="generieren" className="mt-6 max-w-lg space-y-5">
          <button onClick={() => setActiveTab('uebersicht')} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1">
            <ArrowLeft className="h-3 w-3" />Übersicht
          </button>

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
              onClick={() => !pdfFile && fileInputRef.current?.click()}
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
                  resetPrescan()
                }
              }}
            >
              {pdfFile ? (
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-12 w-10 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 shrink-0 flex-col gap-0.5">
                      <FileText className="h-4 w-4 text-rose-500" />
                      <span className="text-[8px] font-bold text-rose-500 leading-none">PDF</span>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm truncate max-w-[200px]">{pdfFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(pdfFile.size / 1024 / 1024).toFixed(1)} MB
                        {' · '}
                        <span className="text-primary/80">~{Math.max(1, Math.round(pdfFile.size / 50000))} Seiten</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; resetPrescan() }}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0 border border-border/50 hover:border-destructive/30"
                    title="PDF entfernen"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-muted">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium hidden sm:block">PDF hier ablegen</p>
                    <p className="text-sm font-medium sm:hidden">PDF auswählen</p>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">oder klicken zum Auswählen · max. 20 MB</p>
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
                  resetPrescan()
                }}
              />
            </div>
          </div>

          {/* ── Pre-Scan: Scanning state ── */}
          {scanStep === 'scanning' && (
            <div className="rounded-2xl border border-violet-200/70 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/80 to-transparent dark:from-violet-950/20 p-5 space-y-4 animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 shrink-0">
                  <ScanSearch className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Claude analysiert dein Dokument...</p>
                  <p className="text-xs text-muted-foreground">Ermittle optimale Einstellungen</p>
                </div>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-violet-200/50 dark:bg-violet-900/30">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-violet-500 to-violet-400 animate-pulse" />
              </div>
            </div>
          )}

          {/* ── Pre-Scan Error ── */}
          {scanError && scanStep === 'idle' && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 animate-fade-in">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-destructive">Pre-Scan fehlgeschlagen</p>
                <p className="text-xs text-muted-foreground">{scanError}</p>
              </div>
            </div>
          )}

          {/* ── Pre-Scan Result ── */}
          {scanStep === 'result' && scanResult && (
            <div className="rounded-2xl border border-violet-200/70 dark:border-violet-800/40 bg-gradient-to-br from-violet-50/60 to-transparent dark:from-violet-950/15 overflow-hidden animate-fade-in">
              {/* Result header */}
              <div className="px-5 pt-4 pb-3 border-b border-violet-200/40 dark:border-violet-800/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30 shrink-0">
                      <Wand2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{scanResult.thema}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{scanResult.seitenanzahl} Seiten</span>
                        <span className="text-muted-foreground/30">·</span>
                        <span className={`text-[11px] font-medium ${
                          scanResult.textdichte === 'hoch' ? 'text-amber-600 dark:text-amber-400' :
                          scanResult.textdichte === 'gering' ? 'text-emerald-600 dark:text-emerald-400' :
                          'text-muted-foreground'
                        }`}>
                          {scanResult.textdichte === 'hoch' ? 'Textlastig' : scanResult.textdichte === 'gering' ? 'Kompakt' : 'Mitteldicht'}
                        </span>
                        {scanResult.hatProfil && (
                          <>
                            <span className="text-muted-foreground/30">·</span>
                            <span className="text-[11px] text-violet-600 dark:text-violet-400 font-medium">Personalisiert</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={resetPrescan}
                    className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Recommendation body */}
              <div className="px-5 py-4 space-y-3">
                {/* Insight texts */}
                <p className="text-xs text-muted-foreground leading-relaxed italic">
                  &ldquo;{scanResult.empfehlung.begruendung}&rdquo;
                </p>
                <p className="text-xs text-muted-foreground/80 leading-relaxed">
                  {scanResult.empfehlung.kartentyp_begruendung}
                </p>

                {/* Settings summary chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 rounded-full bg-violet-50 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-800/40 px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fachtyp</span>
                    <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">{scanResult.fachtyp_label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-card border border-border/60 px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mix</span>
                    <span className="text-xs font-semibold text-foreground">{clozeMix}% Cloze</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-card border border-border/60 px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Karten</span>
                    <span className="text-xs font-semibold text-foreground">~{scanResult.empfehlung.kartenmenge}</span>
                  </div>
                  {scanResult.batches.length > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 px-3 py-1.5">
                      <Layers className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{scanResult.batches.length} Batches</span>
                    </div>
                  )}
                </div>

                {/* Adjust settings toggle */}
                <button
                  onClick={() => setSettingsExpanded(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {settingsExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  Einstellungen {settingsExpanded ? 'ausblenden' : 'anpassen'}
                </button>

                {settingsExpanded && (
                  <div className="grid grid-cols-2 gap-4 pt-1 animate-fade-in">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kartentyp-Mix</Label>
                        <span className="text-xs font-semibold text-primary tabular-nums">{clozeMix}% Cloze</span>
                      </div>
                      <div className="pt-2">
                        <Slider value={[clozeMix]} onValueChange={([v]) => setClozeMix(v)} min={10} max={90} step={10} disabled={generating} className="w-full" />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground/50 font-medium">
                        <span>Lückentext</span>
                        <span>Frage/Antwort</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max. Karten</Label>
                        <span className="text-sm font-semibold tabular-nums text-primary">{batchSize}</span>
                      </div>
                      <div className="pt-2">
                        <Slider value={[batchSize]} onValueChange={([v]) => setBatchSize(v)} min={5} max={50} step={5} disabled={generating} className="w-full" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Von Seite</Label>
                      <Input type="number" min={1} placeholder="1" value={pageFrom} onChange={(e) => setPageFrom(e.target.value)} disabled={generating} className="h-9 bg-card" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bis Seite</Label>
                      <Input type="number" min={1} placeholder="Ende" value={pageTo} onChange={(e) => setPageTo(e.target.value)} disabled={generating} className="h-9 bg-card" />
                    </div>
                    <div className="col-span-2 flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vision-Modus</span>
                      </div>
                      <button
                        onClick={() => setVisionMode(v => !v)}
                        disabled={generating}
                        className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-50 ${visionMode ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                        aria-label="Vision-Modus umschalten"
                      >
                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${visionMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {visionMode && (
                      <div className="col-span-2 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">Analysiert auch Grafiken & Diagramme. Bei komplexen Abbildungen können Batches mit mehr als 20 Seiten das 60-Sekunden-Limit überschreiten.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Batch CTA buttons or single generate */}
              <div className="px-5 pb-5 space-y-2">
                {scanResult.batches.length > 0 ? (
                  (generating || autoBatchRunning) ? (
                    <FactoryLoader
                      progress={genProgress}
                      isAutoBatch={autoBatchRunning}
                      currentBatch={autoBatchRunning ? autoBatchCurrent : (activeBatchIdx !== null ? activeBatchIdx + 1 : 1)}
                      totalBatches={autoBatchTotal}
                      batchLabel={currentBatchLabel}
                      pagesFrom={currentBatchPagesFrom}
                      pagesTo={currentBatchPagesTo}
                      targetCards={currentBatchTargetCards}
                    />
                  ) : (
                    <>
                      {/* All-at-once button */}
                      <Button
                        onClick={handleAlleGenerieren}
                        className="w-full h-10 gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                      >
                        <Sparkles className="h-4 w-4" />
                        Ausgewählte Batches generieren
                      </Button>

                      {/* Divider */}
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 h-px bg-border/50" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">oder einzeln</span>
                        <div className="flex-1 h-px bg-border/50" />
                      </div>

                      {/* Individual batch cards with key concepts checklist */}
                      <div className="space-y-3 pt-1">
                        {scanResult.batches.map((batch, idx) => {
                          const isActive = activeBatchIdx === idx
                          const isDone = completedBatches.has(idx) || (autoBatchRunning && idx < autoBatchCurrent - 1)
                          const isRunning = (generating || autoBatchRunning) && isActive
                          
                          const concepts = batch.schluesselkonzepte ?? []
                          const activeConcepts = concepts.filter((_, cIdx) => selectedConcepts[`${idx}_${cIdx}`] !== false)
                          const isBatchSelected = activeConcepts.length > 0

                          // Calculate adjusted count
                          const prescanTotal = scanResult.empfehlung.kartenmenge
                          const baseRatio = prescanTotal > 0 ? batch.karten / prescanTotal : 1 / scanResult.batches.length
                          const baseBatchCards = Math.max(1, Math.round(batchSize * baseRatio))
                          const adjustedBatchCards = activeConcepts.length === 0 ? 0 : Math.max(1, Math.round(baseBatchCards * (activeConcepts.length / concepts.length)))

                          return (
                            <div
                              key={idx}
                              className={`rounded-xl border border-violet-100 dark:border-violet-900/50 bg-card/60 p-4 transition-all ${
                                isBatchSelected ? 'opacity-100 shadow-sm' : 'opacity-50 bg-muted/20'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 mb-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {isRunning ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-violet-600 shrink-0" />
                                  ) : isDone ? (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shrink-0">✓</span>
                                  ) : (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40 text-[10px] font-bold text-violet-700 dark:text-violet-300 shrink-0">{idx + 1}</span>
                                  )}
                                  <div className="text-left min-w-0">
                                    <p className="text-sm font-semibold truncate text-foreground">{batch.label}</p>
                                    <p className="text-xs text-muted-foreground">Seiten {batch.von}–{batch.bis}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold tabular-nums px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-100/50 dark:border-violet-900/50">
                                    {adjustedBatchCards} {adjustedBatchCards === 1 ? 'Karte' : 'Karten'}
                                  </span>

                                  {!autoBatchRunning && !generating && !isDone && (
                                    <Button
                                      size="sm"
                                      onClick={() => handlePrescanBatchStart(batch, idx)}
                                      disabled={!isBatchSelected}
                                      variant="ghost"
                                      className="h-7 px-2.5 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/20"
                                    >
                                      Generieren
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Checklist of key concepts */}
                              {concepts.length > 0 && (
                                <div className="pl-6 space-y-1.5 border-l border-violet-100/50 dark:border-violet-900/30 ml-2.5">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-1">Schlüsselkonzepte:</p>
                                  {concepts.map((concept, cIdx) => {
                                    const isChecked = selectedConcepts[`${idx}_${cIdx}`] !== false
                                    return (
                                      <label
                                        key={cIdx}
                                        className="flex items-start gap-2 text-xs cursor-pointer select-none py-0.5 hover:text-foreground transition-colors text-muted-foreground"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => !autoBatchRunning && !generating && !isDone && toggleConcept(idx, cIdx)}
                                          disabled={autoBatchRunning || generating || isDone}
                                          className="mt-0.5 rounded border-violet-200 dark:border-violet-800 text-violet-600 focus:ring-violet-500 h-3.5 w-3.5 accent-violet-600 cursor-pointer disabled:cursor-not-allowed"
                                        />
                                        <span className={isChecked ? 'text-foreground font-medium' : 'line-through text-muted-foreground/40'}>
                                          {concept}
                                        </span>
                                      </label>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )
                ) : (
                  <Button
                    onClick={() => handleGenerieren()}
                    disabled={generating}
                    className="w-full h-10 gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                  >
                    {generating ? (
                      <><Loader2 className="h-4 w-4 animate-spin text-white" />Generiere...</>
                    ) : (
                      <><Sparkles className="h-4 w-4" />Jetzt generieren</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── Default state: Settings + action buttons ── */}
          {scanStep === 'idle' && !generating && (
            <>
              {/* Settings */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kartentyp-Mix</Label>
                    <span className="text-xs font-semibold tabular-nums text-primary">{clozeMix}% Cloze</span>
                  </div>
                  <div className="pt-2">
                    <Slider value={[clozeMix]} onValueChange={([v]) => setClozeMix(v)} min={10} max={90} step={10} className="w-full" />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground/50 font-medium">
                    <span>Lückentext</span>
                    <span>Frage/Antwort</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max. Karten</Label>
                    <span className="text-sm font-semibold tabular-nums text-primary">{batchSize}</span>
                  </div>
                  <div className="pt-2">
                    <Slider value={[batchSize]} onValueChange={([v]) => setBatchSize(v)} min={5} max={50} step={5} className="w-full" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Zielanzahl Flashcards</p>
                </div>
                {pdfFile && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Von Seite</Label>
                      <Input type="number" min={1} placeholder="1" value={pageFrom} onChange={(e) => setPageFrom(e.target.value)} className="h-9 bg-card" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bis Seite</Label>
                      <Input type="number" min={1} placeholder="Ende" value={pageTo} onChange={(e) => setPageTo(e.target.value)} className="h-9 bg-card" />
                    </div>
                  </>
                )}
              </div>

              {/* Vision mode toggle */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vision-Modus</span>
                </div>
                <button
                  onClick={() => setVisionMode(v => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${visionMode ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  aria-label="Vision-Modus umschalten"
                >
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${visionMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {visionMode && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 px-3 py-2.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">Analysiert auch Grafiken & Diagramme. Bei komplexen Abbildungen können Batches mit mehr als 20 Seiten das 60-Sekunden-Limit überschreiten.</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handlePrescan}
                  disabled={!pdfFile}
                  variant="outline"
                  className="h-10 gap-2 border-violet-200/70 dark:border-violet-800/40 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20 hover:border-violet-300 dark:hover:border-violet-700 disabled:opacity-40"
                >
                  <ScanSearch className="h-4 w-4" />
                  Analysieren
                </Button>
                <Button
                  onClick={() => handleGenerieren()}
                  disabled={!pdfFile}
                  className="h-10 gap-2 shadow-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  Direkt starten
                </Button>
              </div>
              {pdfFile && (
                <p className="text-[11px] text-center text-muted-foreground -mt-2">
                  Analysieren empfiehlt optimale Einstellungen · Direkt starten nutzt aktuelle Einstellungen
                </p>
              )}
            </>
          )}

          {/* ── Progress bar (during generation, only when no prescan UI is shown) ── */}
          {generating && scanStep !== 'result' && (
            <FactoryLoader
              progress={genProgress}
              batchLabel={currentBatchLabel}
              pagesFrom={currentBatchPagesFrom}
              pagesTo={currentBatchPagesTo}
              targetCards={currentBatchTargetCards}
            />
          )}

          {/* ── Success ── */}
          {lastGenCount != null && !generating && scanStep === 'idle' && (
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
        </TabsContent>

        {/* ── Tab: Review ── */}
        <TabsContent value="review" className="mt-6 max-w-2xl space-y-4">
          <div className="flex items-center justify-between gap-4">
            <button onClick={() => setActiveTab('uebersicht')} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3 w-3" />Übersicht
            </button>
            {reviewKarten.length > 0 && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-background/60 dark:bg-muted/30 backdrop-blur-md border border-border/40 shadow-sm relative z-20 text-[11px]">
                {(['alle', 'core', 'detail', 'fokus'] as const).map(f => {
                  let activeClass = 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                  if (priorityFilter === f) {
                    if (f === 'alle') activeClass = 'bg-primary/10 text-primary border border-primary/10 shadow-sm font-semibold scale-105'
                    else if (f === 'core') activeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/10 shadow-sm font-semibold scale-105'
                    else if (f === 'detail') activeClass = 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/10 shadow-sm font-semibold scale-105'
                    else if (f === 'fokus') activeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10 shadow-sm font-semibold scale-105'
                  }
                  return (
                    <button
                      key={f}
                      onClick={() => setPriorityFilter(f)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all duration-200 capitalize ${activeClass}`}
                    >
                      {f === 'fokus' ? '🎯 Fokus' : f}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          {reviewLoading ? (
            <div className="flex items-center gap-2.5 text-muted-foreground py-12">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Lade Karten...</span>
            </div>
          ) : reviewKarten.length === 0 ? (
            <div className="py-16 text-center space-y-4 animate-fade-in">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                <CheckCheck className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <p className="text-base font-semibold mt-2">Alle Karten überprüft ✓</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Keine neuen Karten im Posteingang.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="default"
                  className="gap-2"
                  onClick={() => setActiveTab('generieren')}
                >
                  <Sparkles className="h-4 w-4" />
                  Neue Karten generieren
                </Button>
                {reviewedCount != null && reviewedCount > 0 && (
                  <Button asChild variant="outline" className="gap-2">
                    <Link href={`/${encodeURIComponent(kursName)}/${encodeURIComponent(themaName)}/lernen`}>
                      <Brain className="h-4 w-4" />
                      Zum Lernen
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ) : activeReviewKarten.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground border border-dashed rounded-2xl">
              Keine neuen Karten entsprechen dem Filter &ldquo;<span className="font-semibold">{priorityFilter}</span>&rdquo;.
            </div>
          ) : (
            <div className="space-y-3">
              {activeReviewKarten.length > 1 && (
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    onClick={handleBulkAccept}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                    Alle annehmen ({activeReviewKarten.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8 text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={handleBulkReject}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Alle verwerfen
                  </Button>
                </div>
              )}
              <ReviewCard
                karte={activeReviewKarten[reviewIdx]}
                current={reviewIdx + 1}
                total={activeReviewKarten.length}
                onPrev={() => setReviewIdx((i) => Math.max(0, i - 1))}
                onNext={() => setReviewIdx((i) => Math.min(activeReviewKarten.length - 1, i + 1))}
                onAccept={handleAccept}
                onReject={handleReject}
                loading={actionLoading}
              />
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Alle Karten ── */}
        <TabsContent value="alle" className="mt-6 max-w-2xl space-y-4">
          <button onClick={() => setActiveTab('uebersicht')} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" />Übersicht
          </button>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setAlleKartenPage(1) }}>
              <SelectTrigger className="w-40 h-9 shrink-0">
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
            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v as 'alle' | 'core' | 'detail' | 'fokus'); setAlleKartenPage(1) }}>
              <SelectTrigger className="w-36 h-9 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alle">Alle Prioritäten</SelectItem>
                <SelectItem value="core">Core</SelectItem>
                <SelectItem value="detail">Detail</SelectItem>
                <SelectItem value="fokus">🎯 Fokus</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Karten durchsuchen…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setAlleKartenPage(1) }}
                className="h-9 pl-8"
              />
            </div>
          </div>

          {alleLoading ? (
            <div className="flex items-center gap-2.5 text-muted-foreground py-12">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Lade Karten...</span>
            </div>
          ) : (() => {
            const filtered = alleKarten.filter((k) => {
              const q = searchQuery.toLowerCase()
              const matchesSearch = searchQuery
                ? (
                    k.frage?.toLowerCase().includes(q) ||
                    k.antwort?.toLowerCase().includes(q) ||
                    k.cloze_text?.toLowerCase().includes(q) ||
                    k.kontext?.toLowerCase().includes(q)
                  )
                : true

              const matchesPriority = priorityFilter === 'alle'
                ? true
                : priorityFilter === 'fokus'
                ? k.tags?.includes('fokus')
                : k.tags?.includes(priorityFilter)

              return matchesSearch && matchesPriority
            })
            const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
            const page = Math.min(alleKartenPage, totalPages)
            const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

            return filtered.length === 0 ? (
              <div className="py-14 text-center space-y-4 animate-fade-in">
                {alleKarten.length === 0 ? (
                  <>
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-muted">
                      <Sparkles className="h-7 w-7 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="text-base font-semibold">Noch keine Karten</p>
                      <p className="text-sm text-muted-foreground mt-1">Lade ein PDF hoch und generiere deine ersten Flashcards.</p>
                    </div>
                    <Button variant="default" className="gap-2" onClick={() => setActiveTab('generieren')}>
                      <Upload className="h-4 w-4" />
                      PDF hochladen
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Keine Karten für diesen Filter.</p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{filtered.length} Karte{filtered.length !== 1 ? 'n' : ''}</span>
                  {totalPages > 1 && (
                    <span>Seite {page} / {totalPages}</span>
                  )}
                </div>
                <div className="space-y-2">
                  {paginated.map((karte) => (
                    <KarteListItem
                      key={karte.id}
                      karte={karte}
                      onUpdate={(updated) => setAlleKarten(prev => prev.map(k => k.id === updated.id ? updated : k))}
                      onDelete={(id) => setAlleKarten(prev => prev.filter(k => k.id !== id))}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      disabled={page <= 1}
                      onClick={() => setAlleKartenPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Zurück
                    </Button>
                    <span className="text-sm text-muted-foreground tabular-nums">{page} / {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1"
                      disabled={page >= totalPages}
                      onClick={() => setAlleKartenPage(p => p + 1)}
                    >
                      Weiter
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </>
            )
          })()}
        </TabsContent>

        {/* ── Tab: Erstellen ── */}
        <TabsContent value="erstellen" className="mt-6 max-w-lg space-y-5">
          <button onClick={() => setActiveTab('uebersicht')} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" />Übersicht
          </button>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Karte manuell erstellen</p>
            <p className="text-sm text-muted-foreground">Karte wird direkt als &bdquo;Überprüft&ldquo; ins Deck übernommen.</p>
          </div>

          <div className="space-y-4 p-4 rounded-xl bg-muted/50 border border-border/50">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Typ</Label>
              <div className="flex gap-2">
                {(['basic', 'cloze'] as KartTyp[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewTyp(t)}
                    className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-all ${
                      newTyp === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {t === 'basic' ? 'Frage / Antwort' : 'Lückentext'}
                  </button>
                ))}
              </div>
            </div>

            {newTyp === 'basic' ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Frage</Label>
                  <Textarea
                    value={newFrage}
                    onChange={(e) => setNewFrage(e.target.value)}
                    rows={3}
                    className="resize-none bg-card"
                    placeholder="Was ist …?"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Antwort</Label>
                  <Textarea
                    value={newAntwort}
                    onChange={(e) => setNewAntwort(e.target.value)}
                    rows={3}
                    className="resize-none bg-card"
                    placeholder="Antwort…"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lückentext</Label>
                <Textarea
                  value={newCloze}
                  onChange={(e) => setNewCloze(e.target.value)}
                  rows={4}
                  className="resize-none bg-card font-mono text-sm"
                  placeholder={`Die Hauptstadt von {{c1::Deutschland}} ist {{c2::Berlin}}.`}
                />
                <p className="text-[10px] text-muted-foreground">Syntax: {`{{c1::Antwort}}`}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kontext <span className="normal-case font-normal">(optional)</span></Label>
              <Textarea
                value={newKontext}
                onChange={(e) => setNewKontext(e.target.value)}
                rows={2}
                className="resize-none bg-card"
                placeholder="Hintergrundinformation…"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags <span className="normal-case font-normal">(optional, kommagetrennt)</span></Label>
              <Input
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                className="bg-card"
                placeholder="definition, formel, klausur"
              />
            </div>
          </div>

          <Button
            onClick={handleCreateKarte}
            disabled={creatingKarte}
            className="w-full h-10 gap-2 shadow-sm"
          >
            {creatingKarte ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Speichere…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Karte erstellen
              </>
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
