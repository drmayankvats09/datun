// ═══════════════════════════════════════════════════════════════
// MOTION — Animation tokens for Datun v2 (single source of truth)
//
// Two consumption surfaces live here, side by side:
//
//   1. CSS-based motion → the existing `MOTION` object
//      Consumed by Tailwind utilities, raw CSS, vanilla DOM.
//      Unit: milliseconds. Easing: cubic-bezier strings.
//      Stable since Task #21 — DO NOT change shape (existing
//      callers in apps/web and apps/api depend on this).
//
//   2. Framer Motion (JS) → named exports added below
//      Consumed by motion components, hooks, JS-driven animations.
//      Unit: seconds (Framer's native unit). Easing: bezier tuples.
//
// Both surfaces share the same conceptual scale
// (instant / fast / normal / moderate / slow / slower). Two units
// (ms vs s) because converting on the consumption site = bugs.
// We pay the cost once, here.
//
// Patterns referenced:
//   - Material Design 3 motion (durations + easing)
//   - Apple Human Interface Guidelines (spring physics, vestibular-
//     safe defaults — entry distance ≤ 24px, no scale below 0.9)
//   - Stripe & Linear (responsive spring for press feedback)
//
// ACCESSIBILITY (WCAG 2.3.3 — Animation from Interactions):
//   These tokens describe motion. Whether to APPLY motion is decided
//   by the consumer via useMotionLevel() (apps/web/hooks).
//   prefers-reduced-motion MUST be respected at the call site.
//
// Task #50 — Framer-friendly exports added (purely additive).
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// LEGACY (Task #21) — CSS-friendly motion tokens
// Backward compatible. Do not remove or rename.
// ─────────────────────────────────────────────────────────────────

export const MOTION = {
  /** Duration scale (ms) */
  duration: {
    /** Instant — button state, checkbox toggle */
    instant: 100,
    /** Fast — tooltips, small reveals */
    fast: 150,
    /** Normal — most transitions (hover, focus, collapse) */
    normal: 200,
    /** Moderate — page transitions, modals */
    moderate: 300,
    /** Slow — complex choreography, skeleton fade-in */
    slow: 500,
  },

  /** CSS duration strings */
  css: {
    instant: '100ms',
    fast: '150ms',
    normal: '200ms',
    moderate: '300ms',
    slow: '500ms',
  },

  /** Easing curves (CSS cubic-bezier strings) */
  easing: {
    /** Default — most transitions */
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    /** Enter screen — elements appearing */
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    /** Leave screen — elements disappearing */
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    /** Bounce — playful interactions (sparingly) */
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  /** Common transition presets (CSS transition shorthand) */
  transition: {
    /** Default — background, color, border, opacity */
    default: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    /** Colors only — hover states */
    colors: 'color 150ms ease, background-color 150ms ease, border-color 150ms ease',
    /** Transform — scale, translate */
    transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    /** Opacity — fade in/out */
    opacity: 'opacity 200ms ease',
  },
} as const;

// ─────────────────────────────────────────────────────────────────
// FRAMER MOTION tokens (Task #50) — seconds + easing arrays
// Use these from anywhere consuming framer-motion APIs.
// ─────────────────────────────────────────────────────────────────

/**
 * Duration scale in seconds — Framer Motion's native unit.
 *
 * Mirrors MOTION.duration with two additions:
 *   - `quick`  (0.15s) — for tooltips, small reveals
 *   - `slower` (0.85s) — for hero entrances, complex choreography
 *
 * Range chosen for perceptual quality:
 *   < 0.1s  → feels instant (not perceived as animation)
 *   0.2s    → "snappy" — most UI defaults
 *   0.3s    → "smooth" — page transitions
 *   > 1s    → feels slow (only for hero / first-mount choreography)
 */
export const DURATION = {
  /** 0s — used as a "skip animation" sentinel for reduced-motion */
  instant: 0,
  /** 0.1s — micro-feedback (checkbox toggle, button state) */
  fast: 0.1,
  /** 0.15s — tooltip, small reveal */
  quick: 0.15,
  /** 0.2s — most transitions (hover, focus, collapse) */
  base: 0.2,
  /** 0.3s — page transitions, modal mount */
  moderate: 0.3,
  /** 0.5s — skeleton fade-in, list stagger */
  slow: 0.5,
  /** 0.85s — hero entrances, complex choreography */
  slower: 0.85,
} as const;

/**
 * Easing curves as Framer-compatible bezier 4-tuples.
 *
 * Naming references the standard motion vocabulary:
 *   - `linear`     — straight line; mechanical / progress bars
 *   - `easeOut`    — fast start, soft land; most UI defaults
 *   - `easeIn`     — slow start, fast end; exits (off-screen)
 *   - `easeInOut`  — symmetric; rarely the right answer
 *   - `smoothOut`  — Material Design's "standard easing"
 *   - `expoOut`    — Apple-like soft landing; heroes, drawers
 *   - `anticipate` — back-easing; small overshoot, playful
 *
 * NOTE: tuples are `as const` so TypeScript infers them as the
 * exact Framer-required type `[number, number, number, number]`.
 */
export const EASE = {
  linear: [0, 0, 1, 1] as const,
  easeOut: [0, 0, 0.2, 1] as const,
  easeIn: [0.4, 0, 1, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
  smoothOut: [0.4, 0, 0.2, 1] as const,
  expoOut: [0.16, 1, 0.3, 1] as const,
  anticipate: [0.34, 1.56, 0.64, 1] as const,
} as const;

/**
 * Spring physics presets. Prefer over fixed durations when motion
 * responds to user input (press, drag, drop) — feels more organic.
 *
 * `stiffness` controls how aggressively the spring snaps to target.
 * `damping`   controls how quickly oscillations settle (higher = no
 *             bounce). `mass` controls inertia (higher = slower).
 *
 * Reference: Apple HIG, iOS UIKit spring defaults.
 */
export const SPRING = {
  /** Calm, slow settle — toasts, banners */
  gentle: { type: 'spring', stiffness: 100, damping: 30, mass: 1 } as const,
  /** Tap/press feedback — the Stripe/Linear default */
  responsive: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
    mass: 1,
  } as const,
  /** Playful bounce — emoji reactions, like/heart */
  bouncy: { type: 'spring', stiffness: 500, damping: 15, mass: 1 } as const,
  /** Crisp, no-bounce — modal mount, sheet open */
  stiff: { type: 'spring', stiffness: 600, damping: 50, mass: 1 } as const,
} as const;

/**
 * Pixel distances for slide / translate animations.
 * Calibrated for our type scale; entry distance ≤ 24px to avoid
 * triggering motion sickness (WCAG vestibular safety guideline).
 */
export const DISTANCE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/**
 * Stagger interval (seconds) between siblings in a sequence.
 * Tighter values feel energetic, looser values feel deliberate.
 */
export const STAGGER = {
  tight: 0.03,
  default: 0.05,
  loose: 0.08,
  relaxed: 0.12,
} as const;

// ─────────────────────────────────────────────────────────────────
// Types — for downstream type-safe consumption
// ─────────────────────────────────────────────────────────────────

export type DurationKey = keyof typeof DURATION;
export type EaseKey = keyof typeof EASE;
export type SpringKey = keyof typeof SPRING;
export type DistanceKey = keyof typeof DISTANCE;
export type StaggerKey = keyof typeof STAGGER;

/** Framer-compatible cubic-bezier tuple */
export type CubicBezier = readonly [number, number, number, number];

/** Framer-compatible spring config */
export interface SpringConfig {
  readonly type: 'spring';
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
}
