import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background p-4">
      <Link
        href="/"
        className="absolute left-4 top-4 flex items-center gap-2.5 sm:left-6 sm:top-6"
      >
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

      {children}
    </div>
  )
}
