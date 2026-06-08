'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Kurs, Thema } from '@/lib/types'
import { GraduationCap } from 'lucide-react'

interface KursWithThemen extends Kurs {
  themen: Thema[]
}

const KURS_COLORS = [
  { bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-950/30', pill: 'bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:hover:bg-violet-900/60' },
  { bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-950/30', pill: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/30', pill: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60' },
  { bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-950/30', pill: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60' },
  { bg: 'bg-rose-500', light: 'bg-rose-50 dark:bg-rose-950/30', pill: 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/60' },
  { bg: 'bg-cyan-500', light: 'bg-cyan-50 dark:bg-cyan-950/30', pill: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-900/60' },
]

function hashColorIdx(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return hash % KURS_COLORS.length
}

export default function KursePage() {
  const [kurse, setKurse] = useState<KursWithThemen[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: kursData } = await supabase.from('kurs').select('*').order('name')
      if (!kursData) { setLoading(false); return }
      const { data: themenData } = await supabase.from('thema').select('*').order('name')
      const themen = (themenData ?? []) as Thema[]
      setKurse(
        (kursData as Kurs[]).map((k) => ({
          ...k,
          themen: themen.filter((t) => t.kurs_id === k.id),
        }))
      )
      setLoading(false)
    }
    load()
  }, [])

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
            <p className="text-sm text-muted-foreground mt-1">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {kurse.map((kurs) => {
          const colorIdx = hashColorIdx(kurs.name)
          const color = KURS_COLORS[colorIdx]

          return (
            <div
              key={kurs.id}
              className="group rounded-xl bg-card shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
            >
              {/* Card header with colored accent */}
              <div className={`px-5 pt-5 pb-4 ${color.light}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white ${color.bg}`}>
                    {kurs.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h2 className="font-semibold text-base leading-tight truncate">{kurs.name}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {kurs.themen.length} {kurs.themen.length === 1 ? 'Thema' : 'Themen'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Themen pills */}
              <div className="px-5 py-4">
                {kurs.themen.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">Keine Themen</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {kurs.themen.map((thema) => (
                      <Link
                        key={thema.id}
                        href={`/${encodeURIComponent(kurs.name)}/${encodeURIComponent(thema.name)}`}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${color.pill}`}
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
    </div>
  )
}
