'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Kurs, Thema } from '@/lib/types'
import { GraduationCap, BookOpen, Zap, Pencil, Trash2, Check, X, Flame, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface StreakData {
  streak: number
  learnedToday: boolean
  dueCount: number
}

interface KursWithThemen extends Kurs {
  themen: Thema[]
}

interface ThemaStats {
  thema: Thema
  kursName: string
  neu: number
  lernen: number
  faellig: number
}

const KURS_COLORS = [
  { bg: 'bg-violet-500' },
  { bg: 'bg-blue-500' },
  { bg: 'bg-emerald-500' },
  { bg: 'bg-amber-500' },
  { bg: 'bg-rose-500' },
  { bg: 'bg-cyan-500' },
]

function hashColorIdx(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return hash % KURS_COLORS.length
}

function FaelligNum({ n }: { n: number }) {
  if (n === 0) return <span className="text-muted-foreground/30">0</span>
  return <span className="text-primary font-semibold">{n}</span>
}

function ZeroOrNum({ n }: { n: number }) {
  if (n === 0) return <span className="text-muted-foreground/30">0</span>
  return <span>{n}</span>
}

export default function KursePage() {
  const [kurse, setKurse] = useState<KursWithThemen[]>([])
  const [loading, setLoading] = useState(true)
  const [tableStats, setTableStats] = useState<ThemaStats[]>([])
  const [tableLoading, setTableLoading] = useState(false)
  const [streak, setStreak] = useState<StreakData | null>(null)

  // Rename state: kursId → editing name
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: kursData } = await supabase.from('kurs').select('*').eq('user_id', user.id).order('name')
    if (!kursData) { setLoading(false); return }
    const kursIds = kursData.map((k) => k.id)
    const { data: themenData } = kursIds.length > 0
      ? await supabase.from('thema').select('*').in('kurs_id', kursIds).order('name')
      : { data: [] }
    const themen = (themenData ?? []) as Thema[]
    const withThemen = (kursData as Kurs[]).map((k) => ({
      ...k,
      themen: themen.filter((t) => t.kurs_id === k.id),
    }))
    setKurse(withThemen)
    setLoading(false)

    if (themen.length === 0) return
    setTableLoading(true)
    const results = await Promise.all(
      themen.map(async (t) => {
        const kursName = (kursData as Kurs[]).find(k => k.id === t.kurs_id)?.name ?? ''
        try {
          const res = await fetch(`/api/karten?thema_id=${t.id}&mode=srs`)
          const data = await res.json() as { learning: unknown[]; reviews: unknown[]; neue: unknown[]; total: number }
          return { thema: t, kursName, neu: data.neue?.length ?? 0, lernen: data.learning?.length ?? 0, faellig: data.reviews?.length ?? 0, total: data.total ?? 0 }
        } catch {
          return { thema: t, kursName, neu: 0, lernen: 0, faellig: 0, total: 0 }
        }
      })
    )
    setTableStats(results.filter(r => r.total > 0) as ThemaStats[])
    setTableLoading(false)
  }

  useEffect(() => {
    loadData()
    fetch('/api/streak').then(r => r.json()).then(setStreak).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRename(kurs: KursWithThemen) {
    const name = renameValue.trim()
    if (!name || name === kurs.name) { setRenamingId(null); return }
    setRenameSaving(true)
    try {
      const res = await fetch(`/api/kurse/${kurs.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) { toast.error('Umbenennen fehlgeschlagen'); return }
      toast.success(`Kurs umbenannt in "${name}"`)
      setRenamingId(null)
      await loadData()
    } finally {
      setRenameSaving(false)
    }
  }

  async function handleDelete(kurs: KursWithThemen) {
    if (!confirm(`Kurs "${kurs.name}" und alle Themen/Karten löschen?`)) return
    setDeletingId(kurs.id)
    try {
      const res = await fetch(`/api/kurse/${kurs.id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Löschen fehlgeschlagen'); return }
      toast.success(`Kurs "${kurs.name}" gelöscht`)
      await loadData()
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-tight mb-8">Kurse</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (kurse.length === 0) {
    return (
      <div>
        <h1 className="text-[1.75rem] font-semibold tracking-tight mb-8">Kurse</h1>
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <GraduationCap className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-base font-medium">Noch keine Kurse</p>
            <p className="text-sm text-muted-foreground mt-1 sm:hidden">
              Lege deine Kurse am besten am Laptop oder Tablet an und generiere dort deine Karten aus deinen PDF-Dokumenten.
            </p>
            <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
              Lege einen Kurs über das <span className="font-semibold">+</span> in der Sidebar an.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1">Übersicht</p>
        <h1 className="text-[1.75rem] font-semibold tracking-tight">Meine Kurse</h1>
      </div>

      {/* Streak widget */}
      {streak && (
        <div className="mb-6 animate-fade-in">
          {streak.streak > 0 ? (
            <div className="relative overflow-hidden rounded-2xl border border-orange-200/60 dark:border-orange-800/40 bg-gradient-to-r from-orange-50 to-amber-50/60 dark:from-orange-950/25 dark:to-amber-950/15 px-5 py-4 flex items-center justify-between gap-4">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[60px] leading-none select-none pointer-events-none opacity-10">🔥</div>
              <div className="flex items-center gap-4 relative">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 leading-none">
                    {streak.streak} {streak.streak === 1 ? 'Tag' : 'Tage'}
                  </p>
                  <p className="text-xs text-orange-700/70 dark:text-orange-300/60 mt-0.5">
                    {streak.learnedToday ? 'Heute schon gelernt ✓' : 'Streak in Gefahr — heute noch lernen!'}
                  </p>
                </div>
              </div>
              {!streak.learnedToday && streak.dueCount > 0 && (
                <div className="text-right shrink-0">
                  <span className="inline-block rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-3 py-1 text-xs font-semibold">
                    {streak.dueCount} fällig
                  </span>
                </div>
              )}
            </div>
          ) : (
            streak.dueCount > 0 && !streak.learnedToday && (
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <Bell className="h-4 w-4 text-primary shrink-0" />
                <p className="text-sm text-foreground">
                  Heute noch nicht gelernt —{' '}
                  <span className="font-semibold text-primary">{streak.dueCount} Karten</span> fällig
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* Kurs cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {kurse.map((kurs) => {
          const colorIdx = hashColorIdx(kurs.name)
          const color = KURS_COLORS[colorIdx]
          const isRenaming = renamingId === kurs.id
          const isDeleting = deletingId === kurs.id

          return (
            <div
              key={kurs.id}
              className="group rounded-xl bg-card shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
            >
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-start gap-3">
                  {isRenaming ? (
                    <>
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white ${color.bg}`}>
                        {kurs.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-1">
                          <Input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(kurs)
                              if (e.key === 'Escape') setRenamingId(null)
                            }}
                            className="h-7 text-sm font-semibold"
                          />
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleRename(kurs)} disabled={renameSaving}>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setRenamingId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {kurs.themen.length} {kurs.themen.length === 1 ? 'Thema' : 'Themen'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/${encodeURIComponent(kurs.name)}`}
                        className="group/link flex min-w-0 flex-1 items-start gap-3"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white ${color.bg}`}>
                          {kurs.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <h2 className="font-semibold text-base leading-tight line-clamp-2 transition-colors group-hover/link:text-primary">{kurs.name}</h2>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {kurs.themen.length} {kurs.themen.length === 1 ? 'Thema' : 'Themen'}
                          </p>
                        </div>
                      </Link>
                      <div className="flex items-start gap-1 pt-0.5">
                        <button
                          onClick={() => { setRenamingId(kurs.id); setRenameValue(kurs.name) }}
                          className="opacity-0 group-hover:opacity-100 flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                          title="Umbenennen"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(kurs)}
                          disabled={isDeleting}
                          className="opacity-0 group-hover:opacity-100 flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                          title="Kurs löschen"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="px-5 py-4">
                {kurs.themen.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">Keine Themen</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {kurs.themen.map((thema) => (
                      <Link
                        key={thema.id}
                        href={`/${encodeURIComponent(kurs.name)}/${encodeURIComponent(thema.name)}`}
                        className="rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        {thema.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* SRS Overview table */}
      {!tableLoading && tableStats.length > 0 && (
        <div className="mt-10">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4">Lernstand</p>
          <div className="rounded-xl border border-border/60 bg-card shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Thema</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">Neu</th>
                    <th className="hidden sm:table-cell px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">Lernen</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">Fällig</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {tableStats.map((row, i) => (
                    <tr
                      key={row.thema.id}
                      className={`border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <Link
                            href={`/${encodeURIComponent(row.kursName)}/${encodeURIComponent(row.thema.name)}`}
                            className="font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {row.thema.name}
                          </Link>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{row.kursName}</p>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-right tabular-nums text-muted-foreground">
                        <ZeroOrNum n={row.neu} />
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-right tabular-nums text-muted-foreground">
                        <ZeroOrNum n={row.lernen} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <FaelligNum n={row.faellig} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/${encodeURIComponent(row.kursName)}/${encodeURIComponent(row.thema.name)}/lernen`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="SRS Lernen"
                          >
                            <BookOpen className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/${encodeURIComponent(row.kursName)}/${encodeURIComponent(row.thema.name)}/drill`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                            title="Drill"
                          >
                            <Zap className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tableLoading && (
        <div className="mt-10">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-4">Lernstand</p>
          <div className="h-32 rounded-xl bg-muted/40 animate-pulse" />
        </div>
      )}
    </div>
  )
}
