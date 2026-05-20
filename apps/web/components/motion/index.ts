// apps/web/components/motion/index.ts
// ═══════════════════════════════════════════════════════════════
// MOTION COMPONENTS — Barrel export
//
// Single import surface for the entire motion design system. One
// import, every motion primitive available with its public types.
//
// Usage:
//   import {
//     MotionConfigProvider,    // root provider
//     FadeIn,                  // viewport-triggered fade + slide
//     PageTransition,          // route-level mount fade
//     PressScale,              // tactile press feedback
//     StaggerContainer,        // list orchestration parent
//     StaggerItem,             // list orchestration child
//     Shake,                   // form-error feedback
//     CheckMark,               // success indicator (SVG draw)
//     CountUp,                 // animated number counter
//     TypingDots,              // AI "thinking" indicator
//     AnimatedChip,            // chat suggestion pill
//     Collapse,                // FAQ / accordion height animation
//     LayoutMorph,             // shared-element transition
//     Shimmer,                 // premium skeleton sweep
//     SlideInFrom,             // directional slide (drawers/sheets)
//     AnimatePresenceWrapper,  // AnimatePresence + reduced-motion bypass
//     PulseAttention,          // subtle CTA emphasis
//     CardHoverLift,           // standardized card hover lift
//     RevealOnScroll,          // flexible viewport reveal
//   } from '@/components/motion';
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

// ── Root Provider (Phase 1) ──
export { MotionConfigProvider, MotionLevelContext } from './motion-config-provider';
export type { MotionLevel, MotionReason, MotionLevelContextValue } from './motion-config-provider';

// ── Refactored Originals (Task #21 → Task #50 Phase 2) ──
export { FadeIn } from './fade-in';
export { PageTransition } from './page-transition';
export { PressScale } from './press-scale';
export { StaggerContainer, StaggerItem } from './stagger-children';

// ── New Components — Phase 2 ──
export { Shake } from './shake';
export type { ShakeProps } from './shake';

export { CheckMark } from './check-mark';
export type { CheckMarkProps } from './check-mark';

export { CountUp } from './count-up';
export type { CountUpProps } from './count-up';

export { TypingDots } from './typing-dots';
export type { TypingDotsProps } from './typing-dots';

export { AnimatedChip } from './chip-animation';
export type { AnimatedChipProps } from './chip-animation';

export { Collapse } from './collapse';
export type { CollapseProps } from './collapse';

export { LayoutMorph } from './layout-morph';
export type { LayoutMorphProps } from './layout-morph';

export { Shimmer } from './shimmer';
export type { ShimmerProps } from './shimmer';

// ── New Components — Phase 3 ──
export { SlideInFrom } from './slide-in-from';
export type { SlideInFromProps } from './slide-in-from';

export { AnimatePresenceWrapper } from './animate-presence-wrapper';
export type { AnimatePresenceWrapperProps } from './animate-presence-wrapper';

export { PulseAttention } from './pulse-attention';
export type { PulseAttentionProps } from './pulse-attention';

export { CardHoverLift } from './card-hover-lift';
export type { CardHoverLiftProps } from './card-hover-lift';

export { RevealOnScroll } from './reveal-on-scroll';
export type { RevealOnScrollProps } from './reveal-on-scroll';
