'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LaptopMockup } from './laptop-mockup'
import { PhoneMockup } from './phone-mockup'

export function DualUseSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

      <div className="container relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Vorbereiten am Laptop. <span className="gradient-text">Lernen unterwegs.</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Lade PDFs am Rechner hoch, organisiere sie in Kursen und Themen – und lerne dann
            überall mit dem Smartphone weiter, wo du gerade Zeit hast.
          </p>
        </motion.div>

        <div
          ref={ref}
          className="relative mx-auto mt-20 grid max-w-5xl items-center gap-16 lg:grid-cols-2 lg:gap-12"
        >
          <div className="absolute left-0 right-0 top-1/2 hidden -translate-y-1/2 border-t border-dashed border-border lg:block" />
          <motion.div
            className="absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 lg:flex"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card shadow-card">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <Badge
              variant="secondary"
              className="absolute -top-4 left-6 z-10 rotate-[-3deg] px-3 py-1 text-xs font-semibold shadow-sm"
            >
              1 · Vorbereiten
            </Badge>
            <LaptopMockup />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative flex justify-center"
          >
            <Badge
              variant="secondary"
              className="absolute -top-4 right-6 z-10 rotate-3 px-3 py-1 text-xs font-semibold shadow-sm sm:right-10"
            >
              2 · Lernen
            </Badge>
            <PhoneMockup className="scale-90 lg:scale-100" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
