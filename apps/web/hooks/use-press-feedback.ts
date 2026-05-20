'use client';

// ═══════════════════════════════════════════════════════════════
// usePressFeedback — Programmatic press animation control
//
// Most interactive elements get press feedback via Framer's
// declarative `whileTap={{ scale: 0.97 }}` — simple and enough.
//
// This hook covers cases where declarative `whileTap` doesn't fit:
//   - Press triggered by a non-pointer event (keyboard, voice command)
//   - Custom press logic (e.g. haptic-only on supported devices)
//   - Press feedback DECOUPLED from the element being pressed
//     (animate element A when element B is pressed)
//
// Returns animation controls that can be wired to any motion
// component via the `animate` prop, plus imperative `press()`,
// `release()`, and one-shot `pulse()` triggers.
//
// Respects useMotionLevel() — when motion is reduced, animations
// are skipped entirely (instant settle, no scale).
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import { useCallback } from 'react';
import { useAnimationControls } from 'framer-motion';
import { SPRING, type SpringConfig } from '@repo/shared';
import { useMotionLevel } from './use-motion-level';

export interface UsePressFeedbackOptions {
  /** Scale factor at press (default: 0.97 — Apple HIG default). */
  scale?: number;
  /** Custom spring config. Defaults to SPRING.responsive. */
  spring?: SpringConfig;
}

export interface UsePressFeedbackResult {
  /** Animation controls — pass to a motion component's `animate` prop. */
  controls: ReturnType<typeof useAnimationControls>;
  /** Trigger the press-down animation. */
  press: () => void;
  /** Trigger the press-up animation. */
  release: () => void;
  /** Single-shot press → release sequence (for keyboard / voice). */
  pulse: () => Promise<void>;
}

/**
 * Programmatic press feedback. Reach for this only when Framer's
 * declarative `whileTap` can't express your use case.
 */
export function usePressFeedback(options: UsePressFeedbackOptions = {}): UsePressFeedbackResult {
  const { scale = 0.97, spring = SPRING.responsive } = options;
  const controls = useAnimationControls();
  const { isReduced } = useMotionLevel();

  const press = useCallback(() => {
    if (isReduced) return;
    void controls.start({ scale, transition: spring });
  }, [controls, scale, spring, isReduced]);

  const release = useCallback(() => {
    if (isReduced) {
      void controls.start({ scale: 1, transition: { duration: 0 } });
      return;
    }
    void controls.start({ scale: 1, transition: spring });
  }, [controls, spring, isReduced]);

  const pulse = useCallback(async () => {
    if (isReduced) return;
    await controls.start({ scale, transition: spring });
    await controls.start({ scale: 1, transition: spring });
  }, [controls, scale, spring, isReduced]);

  return { controls, press, release, pulse };
}
