'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Smartphone, Laptop, Copy, Check, ArrowRight, ArrowLeft, Share, MoreVertical } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'

const CRAMO_URL = 'cramo.ch'

const desktopTip = (
  <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground leading-relaxed">
    💡 Tipp: Lege hier deine Kurse an und generiere deine Karten aus deinen PDF-/Uni-Dokumenten. Dafür hast du am Laptop oder Tablet am meisten Platz.
  </div>
)

const mobileTip = (
  <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground leading-relaxed">
    💡 Tipp: Lege deine Kurse am Laptop oder Tablet an und generiere dort deine Karten aus deinen PDF-/Uni-Dokumenten. Danach kannst du hier am Handy weiterlernen.
  </div>
)

function PhoneWidget() {
  const [slide, setSlide] = useState<0 | 1>(0)

  return (
    <Popover onOpenChange={(open) => { if (!open) setSlide(0) }}>
      <PopoverTrigger asChild>
        <button
          data-tour="phone-widget"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Cramo am Handy"
          aria-label="Cramo am Handy öffnen"
        >
          <Smartphone className="h-[18px] w-[18px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        {slide === 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-center">Jetzt am Handy weiterlernen</p>
            <div className="flex justify-center">
              <div className="rounded-lg bg-white p-2">
                <QRCodeSVG value={`https://${CRAMO_URL}`} size={120} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">QR-Code mit dem Handy scannen</p>
            {desktopTip}
            <button
              onClick={() => setSlide(1)}
              className="flex w-full items-center justify-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Wie installiere ich die App?
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => setSlide(0)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Zurück
            </button>
            <p className="text-sm font-semibold">App installieren</p>
            <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
              <div className="flex items-start gap-2">
                <Share className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-foreground">iPhone (Safari):</span> Teilen-Symbol antippen → &quot;Zum Home-Bildschirm&quot;
                </span>
              </div>
              <div className="flex items-start gap-2">
                <MoreVertical className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-foreground">Android (Chrome):</span> Menü öffnen → &quot;App installieren&quot; bzw. &quot;Zum Startbildschirm hinzufügen&quot;
                </span>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground leading-relaxed">
              Danach öffnet sich Cramo wie eine eigene App, auch offline nutzbar.
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function LaptopWidget() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`https://${CRAMO_URL}`)
      setCopied(true)
      toast.success('Link kopiert')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Kopieren fehlgeschlagen')
    }
  }

  return (
    <>
      <button
        data-tour="laptop-widget"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title="Cramo am Laptop"
        aria-label="Cramo am Laptop öffnen"
      >
        <Laptop className="h-[18px] w-[18px]" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          overlayClassName="bg-black/50"
          className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl p-4"
        >
          <DialogTitle className="text-sm font-semibold">Cramo am Laptop</DialogTitle>
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
              <span className="flex-1 text-sm font-medium truncate">{CRAMO_URL}</span>
              <button
                onClick={handleCopy}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Link kopieren"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Öffne diesen Link im Browser auf deinem Laptop oder Tablet und melde dich mit deinem Account an.
            </p>
            {mobileTip}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function CrossDeviceWidget() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile ? <LaptopWidget /> : <PhoneWidget />
}
