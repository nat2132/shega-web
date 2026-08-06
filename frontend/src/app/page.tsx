'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';
import MobileFeatures from '@/components/sections/MobileFeatures';
import DesktopFeatures from '@/components/sections/DesktopFeatures';
import HowItWorks from '@/components/sections/HowItWorks';
import PricingSection from '@/components/sections/PricingSection';
import FeatureComparison from '@/components/sections/FeatureComparison';
import FreeTrial from '@/components/sections/FreeTrial';
import Screenshots from '@/components/sections/Screenshots';
import FAQ from '@/components/sections/FAQ';
import PaymentSection from '@/components/sections/PaymentSection';
import FinalCTA from '@/components/sections/FinalCTA';

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <MobileFeatures />
      <DesktopFeatures />
      <HowItWorks />
      <PricingSection />
      <FeatureComparison />
      <FreeTrial />
      <Screenshots />
      <FAQ />
      <PaymentSection />
      <FinalCTA />
      <Footer />
    </main>
  );
}
