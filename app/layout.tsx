import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import 'katex/dist/katex.min.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { PwaRegister } from '@/components/pwa-register'
import { PwaInstallBanner } from '@/components/pwa-install-banner'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.cramo.ch'),
  title: {
    default: 'Cramo – KI-Lernkarten aus deinen PDFs',
    template: '%s | Cramo',
  },
  description:
    'Cramo verwandelt deine Vorlesungsfolien und PDFs automatisch in Lernkarten und merkt sich mit Spaced Repetition (FSRS), wann du sie wiederholen musst. Jetzt kostenlos starten.',
  keywords: [
    'Cramo',
    'Lernkarten',
    'Karteikarten',
    'Flashcards',
    'Spaced Repetition',
    'Prüfungsvorbereitung',
    'KI Lernen',
    'PDF zu Lernkarten',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'de_CH',
    url: 'https://www.cramo.ch',
    siteName: 'Cramo',
    title: 'Cramo – KI-Lernkarten aus deinen PDFs',
    description:
      'PDF hochladen, KI macht Karteikarten. Cramo plant deine Wiederholungen mit Spaced Repetition (FSRS).',
    images: [
      {
        url: '/images/cramo-marketing-hero.png',
        width: 1024,
        height: 576,
        alt: 'Cramo Learning – KI-gestützte Lernkarten',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cramo – KI-Lernkarten aus deinen PDFs',
    description:
      'PDF hochladen, KI macht Karteikarten. Cramo plant deine Wiederholungen mit Spaced Repetition (FSRS).',
    images: ['/images/cramo-marketing-hero.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Cramo Learning',
  },
  icons: {
    apple: '/apple-touch-icon.png',
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6d28d9' },
    { media: '(prefers-color-scheme: dark)', color: '#6d28d9' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={geistSans.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
          <PwaRegister />
          <PwaInstallBanner />
        </ThemeProvider>
      </body>
    </html>
  )
}
