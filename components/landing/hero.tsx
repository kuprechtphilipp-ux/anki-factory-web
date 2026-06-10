'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Flame, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TabletMockup } from './tablet-mockup'

const cramoSayings = [
  'Bereit fürs Cramming?',
  'Noch 3 Karten bis zur Pause ☕',
  'Dein Gehirn dankt dir später.',
  'Lernstreak nicht brechen!',
]

export function Hero() {
  const [sayingIndex, setSayingIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setSayingIndex((i) => (i + 1) % cramoSayings.length)
    }, 3500)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="relative overflow-hidden pb-16 pt-28 md:pb-20 md:pt-32">
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-500/10" />

      <div className="container relative">
        <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left"
          >
            <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              KI-gestütztes Lernen
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              PDF hochladen.
              <br />
              <span className="gradient-text">KI macht Karteikarten.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground lg:mx-0">
              Cramo verwandelt deine Vorlesungsfolien automatisch in Lernkarten – und merkt
              sich für dich, wann du sie wiederholen musst.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Jetzt kostenlos starten
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Bereits registriert? Anmelden
              </Link>
            </div>

            <div className="mt-10 flex items-center justify-center gap-4 lg:justify-start">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-4 ring-card shadow-card sm:h-20 sm:w-20">
                <Image
                  src="/icons/Cramo_Icons/Cramo_Hero_Icon.jpeg"
                  alt="Cramo, das müde Waschbär-Maskottchen mit Kaffeetasse"
                  fill
                  priority
                  className="scale-[1.35] object-cover"
                />
              </div>
              <div className="relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={sayingIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="relative rounded-2xl border border-border/50 bg-card px-4 py-2.5 shadow-card"
                  >
                    <p className="text-sm font-medium whitespace-nowrap">{cramoSayings[sayingIndex]}</p>
                    <span className="absolute -left-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l border-border/50 bg-card" />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Produkt-Vorschau: Tablet mit Split-Screen Generieren / Lernen */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative mx-auto w-full max-w-lg"
          >
            <TabletMockup />

            <motion.div
              className="absolute -left-4 -top-4 sm:-left-8 sm:-top-6"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex items-center gap-2.5 rounded-2xl border border-border/50 bg-card px-4 py-3 shadow-card">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                  <Flame className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-none">12 Tage</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Lernstreak</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="absolute -right-4 -bottom-4 sm:-right-8 sm:-bottom-6"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex items-center gap-2.5 rounded-2xl border border-border/50 bg-card px-4 py-3 shadow-card">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BarChart3 className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-none">84%</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Biologie gelernt</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
