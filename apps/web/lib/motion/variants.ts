// ═══════════════════════════════════════════════════════════════
// MOTION VARIANTS — Reusable Framer Motion Variants library
//
// Variants are named animation states. Pass `variants={fadeUp}` plus
// `initial="hidden"` and `animate="visible"` to a motion component —
// the component now has a reusable choreography without inlining
// animation logic at the call site.
//
// All variants honor the design-token contract (DURATION, EASE,
// SPRING, DISTANCE) — DO NOT hardcode numbers here. If you need a
// new spring stiffness or distance, add it to @repo/shared/motion.
//
// Reduced-motion behavior is the consumer's responsibility:
//   - Wrap the app with <MotionConfigProvider> at the root, OR
//   - Use useMotionLevel() inside a component to pick variants.
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import type { Variants } from 'framer-motion';
import { DURATION, EASE, DISTANCE, STAGGER, SPRING } from '@repo/shared';

// ─────────────────────────────────────────────────────────────────
// FADE — opacity-only
// Vestibular-safe; works under prefers-reduced-motion (Framer's
// MotionConfig preserves opacity animations when reducedMotion is on).
// ─────────────────────────────────────────────────────────────────
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: DURATION.moderate, ease: EASE.smoothOut },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.base, ease: EASE.easeIn },
  },
};

// ─────────────────────────────────────────────────────────────────
// FADE + SLIDE (direction = up / down / left / right)
// Most-used pattern: hero entrances, card reveals, list items.
// ─────────────────────────────────────────────────────────────────
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: DISTANCE.lg },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.moderate, ease: EASE.expoOut },
  },
  exit: {
    opacity: 0,
    y: -DISTANCE.sm,
    transition: { duration: DURATION.base, ease: EASE.easeIn },
  },
};

export const fadeDownVariants: Variants = {
  hidden: { opacity: 0, y: -DISTANCE.lg },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.moderate, ease: EASE.expoOut },
  },
  exit: {
    opacity: 0,
    y: DISTANCE.sm,
    transition: { duration: DURATION.base, ease: EASE.easeIn },
  },
};

export const fadeLeftVariants: Variants = {
  hidden: { opacity: 0, x: DISTANCE.lg },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.moderate, ease: EASE.expoOut },
  },
  exit: {
    opacity: 0,
    x: -DISTANCE.sm,
    transition: { duration: DURATION.base, ease: EASE.easeIn },
  },
};

export const fadeRightVariants: Variants = {
  hidden: { opacity: 0, x: -DISTANCE.lg },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.moderate, ease: EASE.expoOut },
  },
  exit: {
    opacity: 0,
    x: DISTANCE.sm,
    transition: { duration: DURATION.base, ease: EASE.easeIn },
  },
};

// ─────────────────────────────────────────────────────────────────
// SCALE — emphasis, modal/sheet enters
// Subtle 0.96 → 1 scale; never start below 0.9 (motion-sickness risk).
// ─────────────────────────────────────────────────────────────────
export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.base, ease: EASE.expoOut },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: DURATION.fast, ease: EASE.easeIn },
  },
};

// ─────────────────────────────────────────────────────────────────
// MODAL / SHEET — spring physics for natural feel
// ─────────────────────────────────────────────────────────────────
export const slideUpModalVariants: Variants = {
  hidden: { opacity: 0, y: '8%' },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING.stiff,
  },
  exit: {
    opacity: 0,
    y: '4%',
    transition: { duration: DURATION.base, ease: EASE.easeIn },
  },
};

export const slideDownNotificationVariants: Variants = {
  hidden: { opacity: 0, y: -DISTANCE.xl },
  visible: {
    opacity: 1,
    y: 0,
    transition: SPRING.responsive,
  },
  exit: {
    opacity: 0,
    y: -DISTANCE.lg,
    transition: { duration: DURATION.base, ease: EASE.easeIn },
  },
};

// ─────────────────────────────────────────────────────────────────
// STAGGER — parent / child orchestration
// Apply staggerContainerVariants to the parent and
// staggerItemVariants to each child. The parent's `visible` state
// drives the children's reveal cadence.
// ─────────────────────────────────────────────────────────────────
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.default,
      delayChildren: 0.05,
    },
  },
  exit: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.tight,
      staggerDirection: -1,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: DISTANCE.md },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE.smoothOut },
  },
  exit: {
    opacity: 0,
    y: -DISTANCE.xs,
    transition: { duration: DURATION.fast, ease: EASE.easeIn },
  },
};

// ─────────────────────────────────────────────────────────────────
// SHAKE — form validation error feedback
// Damped oscillation, ≤ 0.4s, ≤ 8px amplitude (gentle, not aggressive).
// Used by the <Shake> component (Phase 4).
// ─────────────────────────────────────────────────────────────────
export const shakeVariants: Variants = {
  idle: { x: 0 },
  shake: {
    x: [0, -8, 8, -6, 6, -4, 4, 0],
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

// ─────────────────────────────────────────────────────────────────
// CHECK-MARK DRAW — success-state SVG `pathLength` animation
// Two children: circle (drawn first), then check (drawn second
// with a small delay to feel choreographed). Used by <CheckMark>.
// ─────────────────────────────────────────────────────────────────
export const checkCircleDrawVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: DURATION.moderate, ease: EASE.easeOut },
      opacity: { duration: DURATION.fast },
    },
  },
};

export const checkPathDrawVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: DURATION.base,
        ease: EASE.expoOut,
        delay: 0.2,
      },
      opacity: { duration: DURATION.fast, delay: 0.2 },
    },
  },
};

// ─────────────────────────────────────────────────────────────────
// PULSE — attention-grabber for CTAs (use sparingly)
// Subtle 1 → 1.04 → 1 cycle. Limit `repeat` count at the call site
// — infinite pulses become noise within seconds.
// ─────────────────────────────────────────────────────────────────
export const pulseAttentionVariants: Variants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.04, 1],
    transition: {
      duration: 1.4,
      ease: 'easeInOut',
      repeat: Infinity,
      repeatDelay: 1.6,
    },
  },
};

// ─────────────────────────────────────────────────────────────────
// TYPING DOTS — "AI is thinking" indicator
// Three dots wave. Each dot is rendered with its own delay applied
// at the component level (see typing-dots.tsx in Phase 4).
// ─────────────────────────────────────────────────────────────────
export const typingDotVariants: Variants = {
  initial: { y: 0, opacity: 0.4 },
  animate: {
    y: [0, -4, 0],
    opacity: [0.4, 1, 0.4],
    transition: {
      duration: 0.9,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

// ─────────────────────────────────────────────────────────────────
// CHIP — suggestion chip enter / exit (chat AI suggestions)
// ─────────────────────────────────────────────────────────────────
export const chipVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94, y: DISTANCE.xs },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: SPRING.responsive,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: DURATION.fast, ease: EASE.easeIn },
  },
};

// ─────────────────────────────────────────────────────────────────
// HOVER LIFT — card hover state (translate)
// Shadow is normally handled by Tailwind utilities, motion only
// drives the y-offset. Pair with `whileHover="hover"`.
// ─────────────────────────────────────────────────────────────────
export const hoverLiftVariants: Variants = {
  rest: { y: 0 },
  hover: {
    y: -2,
    transition: { duration: DURATION.fast, ease: EASE.smoothOut },
  },
};
