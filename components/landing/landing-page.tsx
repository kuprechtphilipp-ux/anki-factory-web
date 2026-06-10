import { LandingNavbar } from './navbar'
import { Hero } from './hero'
import { DualUseSection } from './dual-use-section'
import { FeatureHighlights } from './feature-highlights'
import { CtaBanner } from './cta-banner'
import { LandingFooter } from './footer'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <Hero />
      <DualUseSection />
      <FeatureHighlights />
      <CtaBanner />
      <LandingFooter />
    </div>
  )
}
