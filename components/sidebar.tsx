'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Kurs, Thema } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BookOpen, ChevronDown, ChevronRight, GraduationCap, LayoutDashboard } from 'lucide-react'

interface KursWithThemen extends Kurs {
  themen: Thema[]
}

export function Sidebar() {
  const pathname = usePathname()
  const [kurse, setKurse] = useState<KursWithThemen[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  useEffect(() => {
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
    load()
  }, [])

  function toggleKurs(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-background">
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
          <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Kurse
          </p>
          {kurse.map((kurs) => {
            const isOpen = expanded.has(kurs.id)
            return (
              <div key={kurs.id}>
                <button
                  onClick={() => toggleKurs(kurs.id)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <BookOpen className="h-4 w-4 shrink-0" />
                  <span className="truncate">{kurs.name}</span>
                </button>

                {isOpen && kurs.themen.length > 0 && (
                  <div className="ml-6 mt-0.5 space-y-0.5">
                    {kurs.themen.map((thema) => {
                      const href = `/${encodeURIComponent(kurs.name)}/${encodeURIComponent(thema.name)}`
                      const isActive = pathname.startsWith(href)
                      return (
                        <Link
                          key={thema.id}
                          href={href}
                          className={cn(
                            'block truncate rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent',
                            isActive && 'bg-accent font-medium'
                          )}
                        >
                          {thema.name}
                        </Link>
                      )
                    })}
                  </div>
                )}

                {isOpen && kurs.themen.length === 0 && (
                  <p className="ml-9 px-3 py-1 text-xs text-muted-foreground">Keine Themen</p>
                )}
              </div>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
