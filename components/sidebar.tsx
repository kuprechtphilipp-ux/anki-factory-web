'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Kurs, Thema } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  BookOpen,
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
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [kurse, setKurse] = useState<KursWithThemen[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  // New Kurs
  const [showNewKurs, setShowNewKurs] = useState(false)
  const [newKursName, setNewKursName] = useState('')
  const [savingKurs, setSavingKurs] = useState(false)

  // New Thema per Kurs
  const [showNewThema, setShowNewThema] = useState<number | null>(null)
  const [newThemaName, setNewThemaName] = useState('')
  const [savingThema, setSavingThema] = useState(false)

  async function load() {
    const { data: kursData } = await supabase.from('kurs').select('*').order('name')
    if (!kursData) return
    const { data: themenData } = await supabase.from('thema').select('*').order('name')
    const themen = (themenData ?? []) as Thema[]
    setKurse(
      (kursData as Kurs[]).map((k) => ({
        ...k,
        themen: themen.filter((t) => t.kurs_id === k.id),
      }))
    )
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
    <aside className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <GraduationCap className="h-5 w-5 text-primary" />
        <span className="font-semibold">Anki Factory</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <Link
          href="/kurse"
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent',
            pathname === '/kurse' && 'bg-accent font-medium'
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Alle Kurse
        </Link>

        <div className="mt-3">
          <div className="flex items-center justify-between px-3 py-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Kurse
            </p>
            <button
              onClick={() => { setShowNewKurs((v) => !v); setNewKursName('') }}
              className="rounded p-0.5 hover:bg-accent text-muted-foreground"
              title="Neuen Kurs anlegen"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {showNewKurs && (
            <div className="px-2 pb-2 flex gap-1">
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
            return (
              <div key={kurs.id}>
                <div className="group flex items-center">
                  <button
                    onClick={() => toggleKurs(kurs.id)}
                    className="flex flex-1 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent min-w-0"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span className="truncate">{kurs.name}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteKurs(kurs)}
                    className="mr-1 shrink-0 rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
                    title="Kurs löschen"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {isOpen && (
                  <div className="ml-6 mt-0.5 space-y-0.5">
                    {kurs.themen.map((thema) => {
                      const href = `/${encodeURIComponent(kurs.name)}/${encodeURIComponent(thema.name)}`
                      const isActive = pathname.startsWith(href)
                      return (
                        <div key={thema.id} className="group flex items-center">
                          <Link
                            href={href}
                            className={cn(
                              'flex-1 truncate rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent',
                              isActive && 'bg-accent font-medium'
                            )}
                          >
                            {thema.name}
                          </Link>
                          <button
                            onClick={() => handleDeleteThema(kurs, thema)}
                            className="mr-1 shrink-0 rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
                            title="Thema löschen"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}

                    {showNewThema === kurs.id ? (
                      <div className="px-1 pb-1 flex gap-1">
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
                        className="flex w-full items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Noch keine Kurse. Klicke auf + um einen anzulegen.
            </p>
          )}
        </div>
      </nav>
    </aside>
  )
}
