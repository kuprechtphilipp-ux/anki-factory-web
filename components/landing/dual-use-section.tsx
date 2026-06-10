'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { LaptopMockup } from './laptop-mockup'
import { PhoneMockup } from './phone-mockup'

export function DualUseSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="py-24 md:py-32">
      <div className="container">
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
          className="mt-16 grid items-center gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-8"
        >
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <LaptopMockup />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex justify-center"
          >
            <PhoneMockup className="scale-90 lg:scale-100" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
