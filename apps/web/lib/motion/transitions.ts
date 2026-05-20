// ═══════════════════════════════════════════════════════════════
// MOTION TRANSITIONS — Pre-baked Framer Motion `transition` configs
//
// Where Variants describe animation STATES (e.g. hidden / visible),
// Transitions describe the CURVE between any two states (duration,
// easing, spring config).
//
// Pass these to <motion.X transition={pageTransition}> for a quick
// inline animation without writing a full variant. Token-driven —
// every duration / spring here originates in @repo/shared/motion.
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import type { Transition } from 'framer-motion';
import { DURATION, EASE, SPRING } from '@repo/shared';

/** Default page-level transition — most generic; safe everywhere. */
export const pageTransition: Transition = {
  duration: DURATION.moderate,
  ease: EASE.smoothOut,
};

/** Modal mount / unmount — crisp spring, no bounce. */
export const modalTransition: Transition = SPRING.stiff;

/** Sheet / drawer slide — gentler spring (mass settles slower). */
export const sheetTransition: Transition = SPRING.gentle;

/** Button press feedback — Stripe / Linear default. */
export const buttonPressTransition: Transition = SPRING.responsive;

/** List item enter — fast and crisp; pair with stagger orchestration. */
export const listItemTransition: Transition = {
  duration: DURATION.base,
  ease: EASE.expoOut,
};

/** Chip enter / exit — spring for organic feel in chat UIs. */
export const chipTransition: Transition = SPRING.stiff;

/** Form-validation shake — fixed duration, ease-out. */
export const shakeTransition: Transition = {
  duration: 0.4,
  ease: 'easeOut',
};

/** SVG check-mark draw — moderate, ease-out. */
export const checkDrawTransition: Transition = {
  duration: DURATION.slow,
  ease: EASE.easeOut,
};

/** Streaming AI tokens — very fast, linear (every token same speed). */
export const streamingTokenTransition: Transition = {
  duration: 0.08,
  ease: 'linear',
};

/** Color-only crossfade — for theme switches, status badge changes. */
export const colorTransition: Transition = {
  duration: DURATION.base,
  ease: EASE.easeOut,
};

/** Skeleton shimmer sweep — linear, infinite loop. */
export const shimmerTransition: Transition = {
  duration: 1.6,
  ease: 'linear',
  repeat: Infinity,
};
