'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface FeatureRowProps {
  eyebrow: string
  title: string
  description: string
  visual: ReactNode
  reverse?: boolean
}

function FeatureRow({ eyebrow, title, description, visual, reverse }: FeatureRowProps) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <motion.div
        initial={{ opacity: 0, x: reverse ? 24 : -24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className={cn('relative', reverse && 'lg:order-2')}
      >
        <div
          className={cn(
            'absolute inset-4 -z-10 rounded-2xl bg-primary/10',
            reverse ? '-rotate-3' : 'rotate-3'
          )}
        />
        <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-card">{visual}</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: reverse ? -24 : 24 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className={cn(reverse && 'lg:order-1')}
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-primary">
          {eyebrow}
        </span>
        <h3 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h3>
        <p className="mt-4 text-lg text-muted-foreground">{description}</p>
      </motion.div>
    </div>
  )
}

function PdfToCardsVisual() {
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <div className="flex h-16 w-12 flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/40">
        <FileText className="h-5 w-5 text-muted-foreground" />
        <span className="text-[8px] font-semibold text-muted-foreground">PDF</span>
      </div>
      <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
      <div className="flex flex-col gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-6 w-32 rounded-md border border-border/60 bg-background shadow-sm"
            style={{ marginLeft: `${i * 6}px`, opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}

function FsrsVisual() {
  const rows = [
    { label: 'Lernen', value: 3, color: 'bg-blue-500' },
    { label: 'Reviews', value: 7, color: 'bg-primary' },
    { label: 'Neu', value: 2, color: 'bg-emerald-500' },
  ]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Heute fällig</p>
        <Badge variant="secondary">12 Karten</Badge>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', row.color)} />
            <span className="w-16 text-sm text-muted-foreground">{row.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full', row.color)}
                style={{ width: `${(row.value / 12) * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OrganizeVisual() {
  return (
    <div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="h-2 w-2 rounded-full bg-violet-500" />
          Biologie
        </div>
        <div className="ml-4 space-y-1.5 text-sm text-muted-foreground">
          <p>Zellbiologie</p>
          <p className="font-medium text-foreground">Genetik</p>
          <p>Ökologie</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {['Mitose', 'Meiose', 'DNA', 'Klausur'].map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs font-normal">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  )
}

export function FeatureHighlights() {
  return (
    <section className="py-24 md:py-32">
      <div className="container flex flex-col gap-24 md:gap-32">
        <FeatureRow
          eyebrow="KI-Generierung"
          title="Aus PDFs werden in Sekunden Lernkarten"
          description="Lade deine Vorlesungsfolien oder Skripte hoch – Cramo liest den Inhalt und erstellt automatisch durchdachte Frage-Antwort- und Lückentext-Karten, die du direkt reviewen kannst."
          visual={<PdfToCardsVisual />}
        />
        <FeatureRow
          eyebrow="Spaced Repetition"
          title="Der FSRS-Algorithmus plant deine Wiederholungen"
          description="Jede Karte bekommt einen optimalen Wiederholtermin. Bewerte einfach mit Nochmal, Schwer, Gut oder Einfach – Cramo merkt sich den Rest und zeigt dir genau, was heute dran ist."
          visual={<FsrsVisual />}
          reverse
        />
        <FeatureRow
          eyebrow="Organisation"
          title="Kurse, Themen & Tags für den Überblick"
          description="Strukturiere deine Karten in Kursen und Themen, vergib Tags für Klausurthemen oder Schwerpunkte – und finde so genau das wieder, was du gerade brauchst."
          visual={<OrganizeVisual />}
        />
      </div>
    </section>
  )
}
