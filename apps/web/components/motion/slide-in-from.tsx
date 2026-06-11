'use client';

// ═══════════════════════════════════════════════════════════════
// SLIDE IN FROM — Directional slide with AnimatePresence-compatible
//                 variants
//
// Slides content in from any edge (top / bottom / left / right) and
// out the same way on unmount. Designed to be placed inside an
// <AnimatePresence> parent so exit animations actually run.
//
// Use cases:
//   - Mobile bottom-sheets (Phase 4 bottom-sheet integration)
//   - Side drawers (mobile-nav, filters)
//   - Toast notifications (replaces Sonner's default fade)
//   - Notification banners
//   - Side-panels in clinic dashboard (Task #80+)
//
// Distance flexibility:
//   - Number → pixels        (e.g. distance={32})
//   - String → CSS unit-aware (e.g. '100%', '50vh', '-2rem')
//   - Default '100%' = fully off-screen on the slide axis.
//
// Spring vs duration:
//   - `spring={true}`  (default) — natural feel for sheets / drawers
//   - `spring={false}` — duration-based ease for predictable toasts
//
// Reduced motion: renders a plain <div>, no animation, no overhead.
//
// Usage:
//   <AnimatePresence>
//     {open && (
//       <SlideInFrom from="bottom" spring>
//         <DrawerContent />
//       </SlideInFrom>
//     )}
//   </AnimatePresence>
// ═══════════════════════════════════════════════════════════════

import { useMemo } from 'react';
import { m, type Variants } from 'framer-motion';
import { SPRING, DURATION, EASE } from '@repo/shared';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

export interface SlideInFromProps {
  children: React.ReactNode;
  className?: string;
  /** Edge to slide in from */
  from: 'top' | 'bottom' | 'left' | 'right';
  /** Distance off-screen at hidden state. Number = px, string = CSS unit. */
  distance?: number | string;
  /** Use spring physics (default true) or fixed-duration ease. */
  spring?: boolean;
  /** Duration in seconds (ignored when spring is true). */
  duration?: number;
}

/**
 * Negates a distance value, preserving its representation (number or
 * CSS string). Used for "top" / "left" directions which slide from
 * the negative side of the axis.
 */
function negate(distance: number | string): number | string {
  if (typeof distance === 'number') return -distance;
  // String case: prepend '-' or remove leading '-' to flip sign.
  return distance.startsWith('-') ? distance.slice(1) : `-${distance}`;
}

/**
 * Compute hidden-state offset for the given direction.
 * Returns the off-screen position; visible state always { x: 0, y: 0 }.
 */
function getOffset(
  from: SlideInFromProps['from'],
  distance: number | string,
): { x: number | string; y: number | string } {
  switch (from) {
    case 'top':
      return { x: 0, y: negate(distance) };
    case 'bottom':
      return { x: 0, y: distance };
    case 'left':
      return { x: negate(distance), y: 0 };
    case 'right':
      return { x: distance, y: 0 };
  }
}

export function SlideInFrom({
  children,
  className,
  from,
  distance = '100%',
  spring = true,
  duration = DURATION.moderate,
}: SlideInFromProps) {
  const { isReduced } = useMotionLevel();

  // Memoise variants so Framer's internal cache stays warm across
  // re-renders that don't change direction / distance.
  const variants = useMemo<Variants>(() => {
    const offset = getOffset(from, distance);
    return {
      hidden: { opacity: 0, ...offset },
      visible: { opacity: 1, x: 0, y: 0 },
      exit: { opacity: 0, ...offset },
    };
  }, [from, distance]);

  const transition = spring ? SPRING.stiff : { duration, ease: EASE.smoothOut };

  if (isReduced) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <m.div
      className={cn(className)}
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={transition}
    >
      {children}
    </m.div>
  );
}
