// ═══════════════════════════════════════════════════════════════
// MOTION ORCHESTRATION — Higher-order helpers
//
// Build complex motion sequences from primitive tokens. Each helper
// returns a Variants / Transition / config object ready to spread
// into a motion component. Helpers exist where a *parameterised*
// variant is needed (e.g. "stagger but a custom interval") — the
// static cases live in `./variants`.
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import type { Variants, Transition } from 'framer-motion';
import { DURATION, EASE, DISTANCE, STAGGER } from '@repo/shared';

/**
 * Build a stagger-container variant with custom timing.
 *
 * @param stagger — seconds between siblings (default: STAGGER.default)
 * @param delayChildren — initial delay before the first child enters
 */
export function buildStaggerContainer(
  stagger: number = STAGGER.default,
  delayChildren: number = 0,
): Variants {
  return {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: stagger, delayChildren },
    },
    exit: {
      opacity: 1,
      transition: { staggerChildren: STAGGER.tight, staggerDirection: -1 },
    },
  };
}

/**
 * Build a directional fade-item variant.
 *
 * @param direction — slide-in direction (or 'none' for opacity-only)
 * @param distance — pixel offset (use DISTANCE.* tokens)
 */
export function buildFadeItem(
  direction: 'up' | 'down' | 'left' | 'right' | 'none' = 'up',
  distance: number = DISTANCE.md,
): Variants {
  const axisMap = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 },
  } as const;

  const off = axisMap[direction];

  return {
    hidden: { opacity: 0, ...off },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: DURATION.moderate, ease: EASE.expoOut },
    },
    exit: {
      opacity: 0,
      transition: { duration: DURATION.base, ease: EASE.easeIn },
    },
  };
}

/**
 * Cascade-from-top — landing-page hero pattern.
 *
 * Children animate top-down, each with a delay = index * stepDelay.
 * Render children with `<motion.div custom={i} variants={cascade}>`
 * — the `custom` prop is passed to the variant's visible() function.
 *
 * @param distance — pixel offset at hidden state
 * @param stepDelay — seconds between siblings
 */
export function buildCascadeFromTop(
  distance: number = DISTANCE.lg,
  stepDelay: number = 0.08,
): Variants {
  return {
    hidden: { opacity: 0, y: distance },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: DURATION.slow,
        ease: EASE.expoOut,
        delay: i * stepDelay,
      },
    }),
  };
}

/**
 * Viewport-reveal config — used with Framer's `whileInView`.
 *
 *   - `once: true`     animation only plays on first scroll-in
 *                      (matches LinkedIn / Medium reveal behaviour).
 *   - `margin: -50px`  triggers slightly before the element is fully
 *                      visible — feels more responsive.
 *   - `amount: 0.2`    20% of the element must be in view first.
 */
export const VIEWPORT_REVEAL = {
  once: true,
  margin: '-50px',
  amount: 0.2,
} as const;

/**
 * Attention-pulse transition with a cycle limit.
 *
 * @param cycles — number of pulses; use Infinity for forever (rare)
 */
export function buildAttentionPulse(cycles: number = 3): Transition {
  return {
    duration: 1.4,
    ease: 'easeInOut',
    repeat: cycles,
    repeatDelay: 1.6,
  };
}
