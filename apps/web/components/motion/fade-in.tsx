'use client';

// ═══════════════════════════════════════════════════════════════
// FADE IN — Scroll-triggered fade + directional slide animation
//
// Elements animate as they enter the viewport (`whileInView`),
// playing at most once per element. This is the "reveal-on-scroll"
// pattern used by Apple product pages, Stripe landing, Linear features.
//
// Task #50 — refactored to use the motion design tokens. The public
// `FadeInProps` shape is preserved exactly so existing callers keep
// working without modification.
//
// Reduced-motion behavior:
//   - On `isReduced` (OS pref OR slow network OR offline),
//     renders a plain <div> with no animation, no Framer overhead.
//   - `useMotionLevel()` (Task #50 composite hook) drives this.
//     Going beyond the legacy `useReducedMotion` lets us also save
//     bytes for users on 2G/3G — critical for India reach.
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { DURATION, EASE } from '@repo/shared';
import { VIEWPORT_REVEAL } from '@/lib/motion';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  /** Direction to animate from */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Distance in pixels */
  distance?: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Delay in seconds */
  delay?: number;
}

// Unit vectors per direction. Multiplied by `distance` at render time.
const directionMap = {
  up: { y: 1, x: 0 },
  down: { y: -1, x: 0 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  none: { x: 0, y: 0 },
} as const;

export function FadeIn({
  children,
  className,
  direction = 'up',
  distance = 20,
  duration = DURATION.slow,
  delay = 0,
}: FadeInProps) {
  const { isReduced } = useMotionLevel();

  if (isReduced) {
    return <div className={className}>{children}</div>;
  }

  const dir = directionMap[direction];

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, x: dir.x * distance, y: dir.y * distance }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={VIEWPORT_REVEAL}
      transition={{ duration, delay, ease: EASE.smoothOut }}
    >
      {children}
    </motion.div>
  );
}
