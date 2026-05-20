'use client';

// ═══════════════════════════════════════════════════════════════
// useMotionLevel — Composite motion-level hook
//
// Returns the effective motion level (full / reduced / none) for the
// current session, sourced from MotionLevelContext (set by the
// MotionConfigProvider at the root).
//
// Components use this when they need to make a per-render decision
// that goes BEYOND what Framer's <MotionConfig> handles automatically.
// Examples:
//   - Skip a heavy parallax effect entirely on slow networks
//   - Replace a slide with a fade when motion is reduced
//   - Render fewer skeleton placeholders to save bandwidth
//
// Usage:
//   const { level, reason, isFull, isReduced } = useMotionLevel();
//   if (isReduced) return <FadeOnly />;
//   return <FullAnimation />;
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import { useContext } from 'react';
import {
  MotionLevelContext,
  type MotionLevel,
  type MotionReason,
} from '@/components/motion/motion-config-provider';

export interface UseMotionLevelResult {
  /** Effective motion level for the current session. */
  level: MotionLevel;
  /** Why this level was chosen (debugging + conditional UI). */
  reason: MotionReason;
  /** Convenience: true when level === 'full'. */
  isFull: boolean;
  /** Convenience: true when level !== 'full'. */
  isReduced: boolean;
}

/**
 * Read the active motion level from the MotionConfigProvider.
 *
 * SSR-safe: returns sensible defaults (level: 'full', reason: 'full')
 * if used outside the provider — animations run normally until the
 * provider hydrates on the client.
 */
export function useMotionLevel(): UseMotionLevelResult {
  const ctx = useContext(MotionLevelContext);
  return {
    level: ctx.level,
    reason: ctx.reason,
    isFull: ctx.level === 'full',
    isReduced: ctx.level !== 'full',
  };
}
