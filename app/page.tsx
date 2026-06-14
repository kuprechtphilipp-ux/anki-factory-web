import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/landing/landing-page'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/kurse')
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Cramo',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url: 'https://www.cramo.ch',
    description:
      'Cramo verwandelt PDFs und Vorlesungsfolien automatisch mit KI in Lernkarten und plant Wiederholungen mit dem FSRS-Spaced-Repetition-Algorithmus.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CHF',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage />
    </>
  )
}
