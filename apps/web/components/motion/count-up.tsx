'use client';

// ═══════════════════════════════════════════════════════════════
// COUNT UP — Animated number counter
//
// A number animates from 0 (or the previous value) to a target value
// over a configurable duration, using a Framer Motion value + transform
// pipeline. Renders inside a motion.span for direct text interpolation.
//
// This is the MVP component for:
//   - Task #64 — Dental Health Score reveal (0 → 72 in 1.2s)
//   - Homepage stats (consultations done, languages, clinics)
//   - Clinic dashboard metrics (Stripe Dashboard style)
//   - Admin panel KPIs
//
// Indian numbering is the default (Intl.NumberFormat 'en-IN') so
// "1,23,456" formats naturally for Datun's audience. Override via
// the `format` prop for currency, percentage, custom layouts.
//
// Accessibility:
//   - aria-live="polite" ensures screen readers announce the final
//     number, not every intermediate frame.
//   - Reduced motion → instant set, no animation.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValue, animate, useMotionValueEvent } from 'framer-motion';
import { DURATION, EASE } from '@repo/shared';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

export interface CountUpProps {
  /** Target value to count up to */
  value: number;
  /** Animation duration in seconds (default DURATION.slower = 0.85s) */
  duration?: number;
  /** Delay before the animation starts (default 0) */
  delay?: number;
  /** Custom formatter. Default: Intl.NumberFormat for `locale`. */
  format?: (n: number) => string;
  /** BCP-47 locale string for Intl formatting (default 'en-IN') */
  locale?: string;
  /** Fires after the count reaches `value` */
  onComplete?: () => void;
  className?: string;
}

export function CountUp({
  value,
  duration = DURATION.slower,
  delay = 0,
  format,
  locale = 'en-IN',
  onComplete,
  className,
}: CountUpProps) {
  const { isReduced } = useMotionLevel();

  // The driving motion value — starts at 0 by default; restarts from
  // the *current* displayed number whenever `value` changes (so the
  // animation feels continuous on re-renders, not jumpy).
  const motionValue = useMotionValue(0);

  // Memoise the formatter; recreating Intl.NumberFormat on every
  // render is non-trivial work.
  const formatter = useMemo<(n: number) => string>(() => {
    if (format) return format;
    const intl = new Intl.NumberFormat(locale);
    return (n: number) => intl.format(Math.round(n));
  }, [format, locale]);

  // We render the formatted text from React state, updated by a
  // motion-value subscription. This keeps the DOM under React's
  // control (so screen readers and tests can read it) while still
  // being driven by Framer's animation loop.
  const [display, setDisplay] = useState<string>(() => formatter(0));

  useMotionValueEvent(motionValue, 'change', (latest) => {
    setDisplay(formatter(latest));
  });

  // `onComplete` and reduced-motion behaviour both depend on `value`
  // so we guard with refs to avoid re-running the animation effect
  // when only the callback identity changes.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (isReduced) {
      motionValue.set(value);
      setDisplay(formatter(value));
      onCompleteRef.current?.();
      return;
    }

    const controls = animate(motionValue, value, {
      duration,
      delay,
      ease: EASE.expoOut,
      onComplete: () => {
        onCompleteRef.current?.();
      },
    });

    return () => controls.stop();
  }, [value, duration, delay, isReduced, motionValue, formatter]);

  return (
    <motion.span
      className={cn(className)}
      aria-live="polite"
      // `aria-atomic` ensures the entire number is announced, not
      // individual digit changes.
      aria-atomic="true"
    >
      {display}
    </motion.span>
  );
}
