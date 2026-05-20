// ═══════════════════════════════════════════════════════════════
// @/lib/motion — One import for all Framer Motion design tokens
//
// Usage:
//   import { fadeUpVariants, pageTransition, VIEWPORT_REVEAL }
//     from '@/lib/motion';
//
// Tokens themselves live in @repo/shared (DURATION, EASE, SPRING,
// DISTANCE, STAGGER) — those are framework-agnostic and consumed by
// both CSS-side and JS-side code. This barrel only re-exports the
// Framer-Motion-specific compositions (Variants, Transitions,
// orchestration helpers) PLUS the underlying tokens for convenience.
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

export * from './variants';
export * from './transitions';
export * from './orchestration';

// Re-export the underlying tokens so consumers can do
// `import { fadeUpVariants, SPRING } from '@/lib/motion';`
// instead of mixing two import sources.
export { DURATION, EASE, SPRING, DISTANCE, STAGGER } from '@repo/shared';
export type {
  DurationKey,
  EaseKey,
  SpringKey,
  DistanceKey,
  StaggerKey,
  CubicBezier,
  SpringConfig,
} from '@repo/shared';
