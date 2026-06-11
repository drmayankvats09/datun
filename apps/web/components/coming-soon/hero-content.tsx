// ═══════════════════════════════════════════════════════════════
// HERO CONTENT — Mission pill (star both sides) + Headline + Subheadline
// ═══════════════════════════════════════════════════════════════

'use client';

import { m, useReducedMotion } from 'framer-motion';

interface HeroContentProps {
  mission: string;
  headline: string;
  subheadline: string;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L14.4 8.6L21 9.3L16 14L17.5 21L12 17.3L6.5 21L8 14L3 9.3L9.6 8.6L12 2Z" />
    </svg>
  );
}

export function HeroContent({ mission, headline, subheadline }: HeroContentProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="mt-7 flex flex-col items-center gap-4 sm:mt-9 sm:gap-5">
      {/* Mission pill — stars on BOTH sides */}
      <m.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.7, ease: EASE_OUT_EXPO }}
        className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-primary sm:px-5 sm:py-2 sm:text-sm"
        style={{
          backgroundColor: 'rgba(0, 168, 150, 0.08)',
          border: '1px solid rgba(0, 168, 150, 0.25)',
        }}
      >
        <StarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="tracking-wide">{mission}</span>
        <StarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </m.div>

      {/* Headline */}
      <m.h2
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.85, delay: 0.85, ease: EASE_OUT_EXPO }}
        className="mt-3 max-w-2xl text-3xl font-bold text-balance text-foreground sm:text-4xl lg:text-5xl"
        style={{ letterSpacing: '-0.025em', lineHeight: 1.1 }}
      >
        {headline}
      </m.h2>

      {/* Subheadline */}
      <m.p
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.05, ease: EASE_OUT_EXPO }}
        className="max-w-xl text-base leading-relaxed text-balance text-muted-foreground sm:text-lg"
      >
        {subheadline}
      </m.p>
    </div>
  );
}
