'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Flame, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LaptopMockup } from './laptop-mockup'
import { PhoneMockup } from './phone-mockup'

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-32 md:pb-32 md:pt-40">
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 top-40 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-500/10" />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
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
        </motion.div>

        <div className="mx-auto mt-20 grid max-w-6xl items-center gap-16 lg:grid-cols-2 lg:gap-12">
          {/* Cramo mascot */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative mx-auto aspect-square w-full max-w-[300px] sm:max-w-[340px]"
          >
            <div className="pointer-events-none absolute -inset-6 rounded-full bg-gradient-to-br from-primary/20 to-violet-300/40 blur-3xl dark:from-primary/10 dark:to-violet-500/10" />

            <div className="relative h-full w-full overflow-hidden rounded-full ring-[10px] ring-card shadow-card">
              <Image
                src="/icons/Cramo_Icons/Cramo_Hero_Icon.jpeg"
                alt="Cramo, das müde Waschbär-Maskottchen mit Kaffeetasse"
                fill
                priority
                className="scale-[1.35] object-cover"
              />
            </div>

            <motion.div
              className="absolute -left-4 top-6 sm:-left-10"
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
              className="absolute -right-4 top-2 flex flex-col items-end gap-1.5 sm:-right-10"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="relative rounded-2xl border border-border/50 bg-card px-3 py-2 shadow-card">
                <p className="text-xs font-medium whitespace-nowrap">Bereit fürs Cramming?</p>
                <span className="absolute -bottom-[5px] right-6 h-2.5 w-2.5 rotate-45 border-b border-r border-border/50 bg-card" />
              </div>
            </motion.div>
          </motion.div>

          {/* Product preview: Laptop zum Generieren, Phone zum Lernen */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mx-auto w-full max-w-md pb-16 pr-6 sm:pb-20 sm:pr-10"
          >
            <LaptopMockup />

            <motion.div
              className="absolute bottom-0 right-0 origin-bottom-right scale-[0.42] sm:scale-[0.5]"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
            >
              <PhoneMockup className="shadow-2xl" />
            </motion.div>

            <motion.div
              className="absolute -bottom-2 left-0 sm:left-4"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
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
