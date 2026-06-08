'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Kurs, Thema } from '@/lib/types'
import { BookOpen, GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface KursWithThemen extends Kurs {
  themen: Thema[]
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
        <h1 className="text-2xl font-bold mb-6">Kurse</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg border bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (kurse.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Kurse</h1>
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <GraduationCap className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">Noch keine Kurse</p>
          <p className="text-sm text-muted-foreground">
            Lege einen Kurs über das <span className="font-medium">+</span> in der Sidebar an.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Kurse</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kurse.map((kurs) => (
          <div key={kurs.id} className="rounded-lg border bg-card p-5 space-y-3 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <h2 className="font-semibold leading-tight">{kurs.name}</h2>
            </div>
            <div className="space-y-1.5">
              {kurs.themen.length === 0 ? (
                <p className="text-xs text-muted-foreground">Keine Themen</p>
              ) : (
                kurs.themen.map((thema) => (
                  <Link
                    key={thema.id}
                    href={`/${encodeURIComponent(kurs.name)}/${encodeURIComponent(thema.name)}`}
                    className="flex items-center justify-between rounded-md px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <span className="truncate">{thema.name}</span>
                  </Link>
                ))
              )}
            </div>
            {kurs.themen.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {kurs.themen.length} {kurs.themen.length === 1 ? 'Thema' : 'Themen'}
              </Badge>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
