'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Flame, BarChart3, Coffee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TabletMockup } from './tablet-mockup'

const cramoSayings = [
  'Bereit fürs Cramming?',
  'Schon deine Karten von heute gelernt?',
  'Dein Gehirn liebt kleine Wiederholungen.',
  'Nur noch 5 Minuten... oder so 😄',
]

export function Hero() {
  const [sayingIndex, setSayingIndex] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [bubbleVisible, setBubbleVisible] = useState(true)
  const [isBubbleHovered, setIsBubbleHovered] = useState(false)

  useEffect(() => {
    const text = cramoSayings[sayingIndex]
    const msPerChar = 45
    let rafId: number
    let displayTimeout: ReturnType<typeof setTimeout>
    let fadeTimeout: ReturnType<typeof setTimeout>
    let startTime: number | null = null

    setTypedText('')
    setBubbleVisible(true)

    // Advance the typed length based on elapsed wall-clock time rather than
    // tick count, so delayed frames (e.g. during hydration on mobile) catch
    // up instead of stretching the animation out into slow motion.
    function tick(now: number) {
      if (startTime === null) startTime = now
      const elapsed = now - startTime
      const charIndex = Math.min(text.length, Math.floor(elapsed / msPerChar))
      setTypedText(text.slice(0, charIndex))
      if (charIndex < text.length) {
        rafId = requestAnimationFrame(tick)
      } else {
        displayTimeout = setTimeout(() => {
          setBubbleVisible(false)
          fadeTimeout = setTimeout(() => {
            setSayingIndex((i) => (i + 1) % cramoSayings.length)
          }, 500)
        }, 5000)
      }
    }

    const startDelay = setTimeout(
      () => {
        rafId = requestAnimationFrame(tick)
      },
      sayingIndex === 0 ? 700 : 600
    )

    return () => {
      clearTimeout(startDelay)
      cancelAnimationFrame(rafId)
      clearTimeout(displayTimeout)
      clearTimeout(fadeTimeout)
    }
  }, [sayingIndex])

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
              <Button
                size="lg"
                asChild
                className="group bg-gradient-to-r from-primary to-violet-500 shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40"
              >
                <Link href="/signup">
                  Jetzt kostenlos starten
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-border/70 bg-card/60 backdrop-blur-sm transition-colors hover:bg-card"
              >
                <Link href="/login">Bereits registriert? Anmelden</Link>
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center gap-6 sm:mt-10 lg:mt-12 lg:justify-start lg:pl-3">
              <div className="relative shrink-0">
                <motion.div
                  className="relative h-28 w-28 overflow-hidden rounded-full shadow-card ring-4 ring-card sm:h-32 sm:w-32"
                  whileHover={{ scale: 1.08 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                >
                  <Image
                    src="/images/Cramo_Studying_Banner_Picture.jpeg"
                    alt="Cramo, das müde Waschbär-Maskottchen mit Kaffeetasse und #Studying-Banner"
                    fill
                    priority
                    className="object-cover"
                  />
                </motion.div>
              </div>

              <div className="relative min-w-0">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
                  whileHover={{ scale: 1.03 }}
                  onMouseEnter={() => setIsBubbleHovered(true)}
                  onMouseLeave={() => setIsBubbleHovered(false)}
                  className={cn(
                    'relative min-w-0 max-w-[180px] rounded-2xl border px-4 py-2.5 shadow-card transition-colors duration-300 sm:max-w-[260px] lg:max-w-none lg:whitespace-nowrap',
                    isBubbleHovered ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-card'
                  )}
                >
                  <AnimatePresence mode="wait">
                    {isBubbleHovered ? (
                      <motion.p
                        key="hover"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        className="flex items-center gap-1.5 text-sm font-medium text-primary"
                      >
                        <Coffee className="h-4 w-4" />
                        Bring mir Kaffee, bitte!
                      </motion.p>
                    ) : (
                      <motion.p
                        key="greeting"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: bubbleVisible ? 1 : 0, y: bubbleVisible ? 0 : -6 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.45, ease: 'easeInOut' }}
                        className="text-sm font-medium"
                      >
                        {typedText}
                        {typedText.length < cramoSayings[sayingIndex].length && (
                          <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-current align-middle" />
                        )}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <span
                    className={cn(
                      'absolute -left-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l transition-colors duration-300',
                      isBubbleHovered ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-card'
                    )}
                  />
                </motion.div>
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
              className="absolute -left-4 -top-10 hidden sm:-left-8 sm:-top-12 sm:block"
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
              className="absolute -right-4 -bottom-10 hidden sm:-right-8 sm:-bottom-12 sm:block"
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
                  <p className="mt-1 text-[10px] text-muted-foreground">Marketing gelernt</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
