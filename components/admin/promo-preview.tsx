import Image from 'next/image'
import { CheckCircle2, Sparkles, FileText } from 'lucide-react'

export function PromoPreview() {
  return (
    <div className="dark overflow-hidden rounded-3xl border border-border/30 bg-background text-foreground shadow-2xl">
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src="/images/cramo-marketing-hero.png"
          alt="Cramo Marketing Banner"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/10" />

        {/* Floating flashcard mockup */}
        <div className="absolute left-[8%] top-[14%] hidden sm:block [perspective:1000px]">
          <div className="animate-float-card">
            <div className="relative h-28 w-44 animate-flip-card [transform-style:preserve-3d]">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl border border-border/40 bg-card/90 p-3 text-center shadow-2xl backface-hidden backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">Frage</p>
                <p className="text-sm font-semibold leading-tight">Was ist FSRS?</p>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl border border-primary/40 bg-primary/10 p-3 text-center shadow-2xl backface-hidden backdrop-blur-sm [transform:rotateY(180deg)]">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/80">Antwort</p>
                <p className="text-sm font-semibold leading-tight">Ein Spaced-Repetition-Algorithmus</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI status widget */}
        <div className="absolute bottom-6 right-6 flex items-center gap-2.5 rounded-2xl border border-border/30 bg-card/90 px-4 py-3 shadow-2xl backdrop-blur-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <CheckCircle2 className="h-[18px] w-[18px]" />
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold leading-none">
              <FileText className="h-3 w-3 text-muted-foreground" />
              PDF erfolgreich gescannt
            </p>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              20 Karten generiert
            </p>
          </div>
        </div>

        {/* Marketing copy */}
        <div className="absolute bottom-6 left-6 max-w-sm">
          <p className="text-lg font-bold leading-tight sm:text-2xl">
            <span className="gradient-text">Cramo</span> – AI-gestützte Karteikarten aus deinen PDF-Scans.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Jetzt Beta testen auf <span className="font-semibold text-foreground">cramo.ch</span>
          </p>
        </div>
      </div>
    </div>
  )
}
