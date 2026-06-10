import Link from 'next/link'
import Image from 'next/image'

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="container flex flex-col items-center justify-between gap-6 sm:flex-row">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-border/60">
            <Image src="/images/cramo-mascot.png" alt="Cramo" fill className="object-cover" />
          </div>
          <span className="text-base font-bold tracking-tight">Cramo</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/login" className="transition-colors hover:text-foreground">
            Login
          </Link>
          <Link href="/signup" className="transition-colors hover:text-foreground">
            Sign Up
          </Link>
        </nav>

        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Cramo
        </p>
      </div>
    </footer>
  )
}
