'use client';

import { type ReactNode } from 'react';
import { DotGrid, Particles, GradientBackground } from './Backgrounds';

interface PageBackgroundProps {
  children: ReactNode;
  showParticles?: boolean;
  showDots?: boolean;
  gradientVariant?: number;
  className?: string;
}

export function PageBackground({
  children,
  showParticles = false,
  showDots = true,
  gradientVariant = 1,
  className = '',
}: PageBackgroundProps) {
  return (
    <div className={`relative ${className}`}>
      <GradientBackground variant={gradientVariant} />
      {showDots && <DotGrid />}
      {showParticles && <Particles />}
      {children}
    </div>
  );
}

export function MarketingBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <GradientBackground variant={1} />
      <DotGrid />
      {children}
    </div>
  );
}

export function AdminBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <GradientBackground variant={2} />
      <DotGrid />
      {children}
    </div>
  );
}

export function CustomerBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <GradientBackground variant={3} />
      <DotGrid />
      {children}
    </div>
  );
}
