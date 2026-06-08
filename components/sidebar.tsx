'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Kurs, Thema } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface KursWithThemen extends Kurs {
  themen: Thema[]
  dueByThema?: Record<number, number>
}

const KURS_COLORS = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
]

function hashColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return KURS_COLORS[hash % KURS_COLORS.length]
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [kurse, setKurse] = useState<KursWithThemen[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [dueMap, setDueMap] = useState<Record<number, number>>({})

  const [showNewKurs, setShowNewKurs] = useState(false)
  const [newKursName, setNewKursName] = useState('')
  const [savingKurs, setSavingKurs] = useState(false)

  const [showNewThema, setShowNewThema] = useState<number | null>(null)
  const [newThemaName, setNewThemaName] = useState('')
  const [savingThema, setSavingThema] = useState(false)

  async function load() {
    const { data: kursData } = await supabase.from('kurs').select('*').order('name')
    if (!kursData) return
    const { data: themenData } = await supabase.from('thema').select('*').order('name')
    const themen = (themenData ?? []) as Thema[]
    const loaded = (kursData as Kurs[]).map((k) => ({
      ...k,
      themen: themen.filter((t) => t.kurs_id === k.id),
    }))
    setKurse(loaded)

    // Load due counts per thema
    const allThemenIds = themen.map((t) => t.id)
    const newDueMap: Record<number, number> = {}
    await Promise.all(
      allThemenIds.map(async (tid) => {
        try {
          const res = await fetch(`/api/karten?thema_id=${tid}&status=reviewed&due=true`)
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) newDueMap[tid] = data.length
        } catch { /* ignore */ }
      })
    )
    setDueMap(newDueMap)
  }

  useEffect(() => { load() }, [])

  function toggleKurs(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  async function handleAddKurs() {
    const name = newKursName.trim()
    if (!name) return
    setSavingKurs(true)
    try {
      const res = await fetch('/api/kurse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) { toast.error('Kurs konnte nicht angelegt werden'); return }
      const kurs = await res.json() as Kurs
      setNewKursName('')
      setShowNewKurs(false)
      await load()
      setExpanded((prev) => new Set(prev).add(kurs.id))
    } finally {
      setSavingKurs(false)
    }
  }

  async function handleDeleteKurs(kurs: KursWithThemen) {
    if (!confirm(`Kurs "${kurs.name}" und alle Themen/Karten löschen?`)) return
    const res = await fetch(`/api/kurse/${kurs.id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Löschen fehlgeschlagen'); return }
    toast.success(`Kurs "${kurs.name}" gelöscht`)
    await load()
    if (pathname.startsWith(`/${encodeURIComponent(kurs.name)}`)) router.push('/kurse')
  }

  async function handleAddThema(kursId: number) {
    const name = newThemaName.trim()
    if (!name) return
    setSavingThema(true)
    try {
      const res = await fetch('/api/themen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kurs_id: kursId, name }),
      })
      if (!res.ok) { toast.error('Thema konnte nicht angelegt werden'); return }
      const thema = await res.json() as Thema
      const kurs = kurse.find((k) => k.id === kursId)
      setNewThemaName('')
      setShowNewThema(null)
      await load()
      if (kurs) {
        router.push(`/${encodeURIComponent(kurs.name)}/${encodeURIComponent(thema.name)}`)
      }
    } finally {
      setSavingThema(false)
    }
  }

  async function handleDeleteThema(kurs: KursWithThemen, thema: Thema) {
    if (!confirm(`Thema "${thema.name}" und alle Karten löschen?`)) return
    const res = await fetch(`/api/themen/${thema.id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error('Löschen fehlgeschlagen'); return }
    toast.success(`Thema "${thema.name}" gelöscht`)
    await load()
    const href = `/${encodeURIComponent(kurs.name)}/${encodeURIComponent(thema.name)}`
    if (pathname.startsWith(href)) router.push('/kurse')
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border/50 bg-card shadow-sm">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border/50 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <GraduationCap className="h-4.5 w-4.5 h-[18px] w-[18px] text-primary-foreground" />
        </div>
        <span className="font-semibold gradient-text tracking-tight">Anki Factory</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {/* Dashboard link */}
        <Link
          href="/kurse"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent hover:text-accent-foreground',
            pathname === '/kurse'
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground'
          )}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          Alle Kurse
        </Link>

        <div className="mt-4">
          <div className="flex items-center justify-between px-3 py-1 mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Kurse
            </p>
            <button
              onClick={() => { setShowNewKurs((v) => !v); setNewKursName('') }}
              className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Neuen Kurs anlegen"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {showNewKurs && (
            <div className="px-2 pb-2 flex gap-1 animate-fade-in">
              <Input
                autoFocus
                placeholder="Kursname"
                value={newKursName}
                onChange={(e) => setNewKursName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddKurs() }}
                className="h-7 text-xs"
              />
              <Button
                size="sm"
                className="h-7 px-2"
                onClick={handleAddKurs}
                disabled={savingKurs || !newKursName.trim()}
              >
                {savingKurs ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              </Button>
            </div>
          )}

          {kurse.map((kurs) => {
            const isOpen = expanded.has(kurs.id)
            const colorClass = hashColor(kurs.name)
            const kursActive = pathname.startsWith(`/${encodeURIComponent(kurs.name)}`)

            return (
              <div key={kurs.id}>
                <div className="group relative flex items-center">
                  {/* Active indicator */}
                  {kursActive && (
                    <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary" />
                  )}
                  <button
                    onClick={() => toggleKurs(kurs.id)}
                    className={cn(
                      'flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent min-w-0',
                      kursActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <div className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white', colorClass)}>
                      {kurs.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{kurs.name}</span>
                    <span className="ml-auto shrink-0 text-muted-foreground">
                      {isOpen
                        ? <ChevronDown className="h-3 w-3" />
                        : <ChevronRight className="h-3 w-3" />
                      }
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteKurs(kurs)}
                    className="mr-1 shrink-0 rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                    title="Kurs löschen"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {isOpen && (
                  <div className="ml-4 mt-0.5 mb-1 pl-3 border-l border-border/60 space-y-0.5">
                    {kurs.themen.map((thema) => {
                      const href = `/${encodeURIComponent(kurs.name)}/${encodeURIComponent(thema.name)}`
                      const isActive = pathname.startsWith(href)
                      const dueCount = dueMap[thema.id]

                      return (
                        <div key={thema.id} className="group flex items-center gap-1">
                          <Link
                            href={href}
                            className={cn(
                              'flex-1 truncate rounded-md px-2.5 py-1.5 text-sm transition-all',
                              isActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            )}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="truncate">{thema.name}</span>
                              {dueCount && dueCount > 0 && (
                                <span className="ml-auto shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                                  {dueCount > 9 ? '9+' : dueCount}
                                </span>
                              )}
                            </span>
                          </Link>
                          <button
                            onClick={() => handleDeleteThema(kurs, thema)}
                            className="shrink-0 rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                            title="Thema löschen"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}

                    {showNewThema === kurs.id ? (
                      <div className="px-1 pb-1 flex gap-1 animate-fade-in">
                        <Input
                          autoFocus
                          placeholder="Themaname"
                          value={newThemaName}
                          onChange={(e) => setNewThemaName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddThema(kurs.id) }}
                          className="h-7 text-xs"
                        />
                        <Button
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleAddThema(kurs.id)}
                          disabled={savingThema || !newThemaName.trim()}
                        >
                          {savingThema ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setShowNewThema(kurs.id); setNewThemaName('') }}
                        className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground/60 hover:bg-accent hover:text-muted-foreground transition-all"
                      >
                        <Plus className="h-3 w-3" />
                        Thema anlegen
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {kurse.length === 0 && !showNewKurs && (
            <p className="px-3 py-3 text-xs text-muted-foreground/60 leading-relaxed">
              Noch keine Kurse. Klicke auf + um einen anzulegen.
            </p>
          )}
        </div>
      </nav>
    </aside>
  )
}
