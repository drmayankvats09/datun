'use client';

// ═══════════════════════════════════════════════════════════════
// CHECK MARK — Animated success indicator
//
// SVG circle draws itself first (pathLength 0 → 1), then the check
// path draws inside with a small delay. The choreography feels like
// "approval being granted" — premium success state used by Stripe
// (payment success), WhatsApp (read receipts), Apple Pay.
//
// Use cases in Datun:
//   - Consultation complete
//   - PDF report generated
//   - Form submitted
//   - OTP verified
//   - Appointment booked
//   - Payment received
//
// Accessibility:
//   - role="img" + aria-label for screen readers
//   - Reduced motion → static fully-drawn checkmark (no animation)
//
// Usage:
//   <CheckMark size="lg" onComplete={() => router.push('/dashboard')} />
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { m } from 'framer-motion';
import { checkCircleDrawVariants, checkPathDrawVariants } from '@/lib/motion';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

export interface CheckMarkProps {
  /** Size preset or explicit pixel size */
  size?: 'sm' | 'md' | 'lg' | number;
  /** Stroke colour (defaults to CSS var --primary) */
  color?: string;
  /** Stroke width in SVG units (default 3) */
  strokeWidth?: number;
  /** Screen-reader label (default "Success") */
  ariaLabel?: string;
  /** Fires after the check-path stroke finishes drawing */
  onComplete?: () => void;
  className?: string;
}

const SIZE_PRESETS = {
  sm: 16,
  md: 24,
  lg: 48,
} as const;

export function CheckMark({
  size = 'md',
  color = 'var(--primary)',
  strokeWidth = 3,
  ariaLabel = 'Success',
  onComplete,
  className,
}: CheckMarkProps) {
  const { isReduced } = useMotionLevel();
  const pixelSize = useMemo(() => (typeof size === 'number' ? size : SIZE_PRESETS[size]), [size]);

  // SVG viewBox is 24×24; we scale via width/height attributes.
  // Coordinates below are tuned for that viewBox.
  const CIRCLE_R = 10;
  const CIRCLE_CX = 12;
  const CIRCLE_CY = 12;
  // Check path: M5.5 12.5  L10 17  L18.5 8.5
  // (start lower-left, dip down-right, up to upper-right corner)
  const CHECK_PATH = 'M5.5 12.5 L10 17 L18.5 8.5';

  if (isReduced) {
    // Render the final state without animation — instant draw.
    return (
      <svg
        role="img"
        aria-label={ariaLabel}
        className={cn(className)}
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx={CIRCLE_CX} cy={CIRCLE_CY} r={CIRCLE_R} />
        <path d={CHECK_PATH} />
      </svg>
    );
  }

  return (
    <m.svg
      role="img"
      aria-label={ariaLabel}
      className={cn(className)}
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="hidden"
      animate="visible"
    >
      <m.circle cx={CIRCLE_CX} cy={CIRCLE_CY} r={CIRCLE_R} variants={checkCircleDrawVariants} />
      <m.path
        d={CHECK_PATH}
        variants={checkPathDrawVariants}
        onAnimationComplete={() => onComplete?.()}
      />
    </m.svg>
  );
}
