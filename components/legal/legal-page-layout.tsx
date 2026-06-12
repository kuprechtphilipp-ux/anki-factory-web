import Link from 'next/link'
import Image from 'next/image'

interface LegalPageLayoutProps {
  title: string
  stand: string
  children: React.ReactNode
}

export function LegalPageLayout({ title, stand, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-border/60 shadow-sm">
              <Image
                src="/icons/Cramo_Icons/Cramo_App_Icon_dark_background.png"
                alt="Cramo"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-lg font-bold tracking-tight">Cramo</span>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Zurück zur Startseite
          </Link>
        </div>
      </header>

      <main className="container max-w-3xl py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Stand: {stand}</p>

        <div
          className="
            mt-8 space-y-4 text-sm leading-relaxed text-foreground
            [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight
            [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold
            [&_p]:text-muted-foreground
            [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ul]:text-muted-foreground
            [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
            [&_strong]:text-foreground
          "
        >
          {children}
        </div>
      </main>
    </div>
  )
}
