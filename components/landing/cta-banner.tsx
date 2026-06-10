'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CtaBanner() {
  return (
    <section className="dark relative overflow-hidden bg-background py-24 text-foreground md:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            Bereit fürs nächste <span className="gradient-text">Cramming?</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Lade dein erstes PDF hoch und lass Cramo in Sekunden deine Karteikarten
            erstellen – kostenlos und ohne Setup.
          </p>
          <div className="mt-8 flex justify-center">
            <Button size="lg" asChild>
              <Link href="/signup">
                Jetzt kostenlos starten
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-16 flex items-center justify-center gap-4"
        >
          <div className="-rotate-6 rounded-2xl border border-border/30 bg-card p-2 shadow-2xl">
            <Image
              src="/images/cramo-mascot.png"
              alt="Cramo Maskottchen"
              width={64}
              height={64}
              className="rounded-xl"
            />
          </div>
          <div className="rotate-3 rounded-2xl border border-border/30 bg-card px-5 py-4 shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-sm font-bold leading-none">12 Karten</p>
                <p className="mt-1 text-[10px] text-muted-foreground">heute fällig</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
