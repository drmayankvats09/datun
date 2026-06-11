'use client';

// ═══════════════════════════════════════════════════════════════
// REVEAL ON SCROLL — Flexible viewport-triggered entrance
//
// Like <FadeIn> but parameterised over more axes (replay, threshold,
// distance, direction) and uses the orchestration helper for variant
// construction. Use this for marketing pages where each scroll
// section needs distinct motion (Task #55 homepage, Task #76 /clinics).
//
// Differences from <FadeIn>:
//   - `replay` option (re-trigger every time the element re-enters
//     the viewport — useful for long scroll narratives).
//   - `threshold` option (control how much of the element must be
//     visible before the animation fires; default 20%).
//   - Uses `buildFadeItem` orchestration helper instead of inlining
//     the direction-to-offset map — single source of truth.
//
// When to use which:
//   - Use <FadeIn> for the simple, opinionated case (Apple/Stripe-
//     style "first paint of section" reveal).
//   - Use <RevealOnScroll> for marketing narratives where each
//     section needs different choreography.
//
// Reduced motion: renders children as a plain <div>.
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { m } from 'framer-motion';
import { DURATION, EASE, DISTANCE } from '@repo/shared';
import { buildFadeItem } from '@/lib/motion';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

export interface RevealOnScrollProps {
  children: React.ReactNode;
  className?: string;
  /** Direction to slide in from (default 'up') */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Slide distance in pixels (default DISTANCE.lg = 16) */
  distance?: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Delay before animation starts */
  delay?: number;
  /** When true, replay every time the element re-enters the viewport
   *  (default false — animation plays once and stays). */
  replay?: boolean;
  /** Fraction of the element that must be in viewport to trigger
   *  (0-1, default 0.2 = 20%). */
  threshold?: number;
}

export function RevealOnScroll({
  children,
  className,
  direction = 'up',
  distance = DISTANCE.lg,
  duration = DURATION.moderate,
  delay = 0,
  replay = false,
  threshold = 0.2,
}: RevealOnScrollProps) {
  const { isReduced } = useMotionLevel();

  // Memoise variants — buildFadeItem creates a fresh object each
  // call; without memoisation Framer would see "new" variants every
  // render and re-evaluate animations.
  const variants = useMemo(() => buildFadeItem(direction, distance), [direction, distance]);

  // Memoise viewport config for the same reason.
  const viewport = useMemo(
    () => ({
      once: !replay,
      margin: '-50px',
      amount: threshold,
    }),
    [replay, threshold],
  );

  if (isReduced) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <m.div
      className={cn(className)}
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      transition={{ duration, delay, ease: EASE.expoOut }}
    >
      {children}
    </m.div>
  );
}
