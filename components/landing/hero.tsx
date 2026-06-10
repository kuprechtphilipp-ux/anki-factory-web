'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Flame, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PhoneMockup } from './phone-mockup'

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-32 md:pb-32 md:pt-40">
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-500/10" />

      <div className="container relative grid items-center gap-16 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            KI-gestütztes Lernen
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            PDF hochladen.
            <br />
            <span className="gradient-text">KI macht Karteikarten.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Cramo verwandelt deine Vorlesungsfolien automatisch in Lernkarten – und merkt
            sich für dich, wann du sie wiederholen musst.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative mx-auto flex justify-center py-6"
        >
          <PhoneMockup />

          <motion.div
            className="absolute -left-4 top-12 sm:-left-12"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
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
            className="absolute -right-4 bottom-12 sm:-right-10"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
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

          <motion.div
            className="absolute -right-2 -top-8 rotate-[8deg] rounded-2xl border border-border/50 bg-card p-2 shadow-card sm:-right-12"
            animate={{ y: [0, -8, 0], rotate: [8, 5, 8] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image
              src="/images/cramo-mascot.png"
              alt="Cramo Maskottchen"
              width={56}
              height={56}
              className="rounded-xl"
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
