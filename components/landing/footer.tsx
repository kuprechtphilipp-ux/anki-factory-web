import Link from 'next/link'
import Image from 'next/image'
import { Coffee } from 'lucide-react'

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="container py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-border/60 shadow-sm">
                <Image src="/images/cramo-mascot.png" alt="Cramo" fill className="object-cover" />
              </div>
              <span className="text-lg font-bold tracking-tight">Cramo</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Dein Lernbuddy für die Nachtschicht vor der Prüfung: PDF rein, Karteikarten
              raus, Wiederholung auf Autopilot.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
              <Coffee className="h-3.5 w-3.5 text-primary" />
              Mit viel Kaffee gebaut
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">Produkt</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link href="/signup" className="transition-colors hover:text-foreground">
                  Jetzt starten
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-foreground">
                  Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Was Cramo kann</p>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>KI-Karteikarten aus PDFs</li>
              <li>Spaced Repetition mit FSRS</li>
              <li>Kurse, Themen &amp; Tags</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col-reverse items-center justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Cramo. Alle Rechte vorbehalten.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/login" className="transition-colors hover:text-foreground">
              Login
            </Link>
            <Link href="/signup" className="transition-colors hover:text-foreground">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
