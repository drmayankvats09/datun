'use client';

// ═══════════════════════════════════════════════════════════════
// MOTION CONFIG PROVIDER — Root motion governance
//
// One provider, four jobs:
//
//   1. <MotionConfig reducedMotion="user">
//        Wires the entire app to honor the user's OS-level
//        prefers-reduced-motion setting. When set, transforms +
//        layout animations are disabled automatically by Framer
//        Motion; opacity-only animations stay enabled
//        (vestibular-safe by default — WCAG 2.3.3).
//
//   2. <LazyMotion features={domAnimation}>
//        Bundle-reduction foundation. The full `motion.*` API ships
//        ~50KB gzipped. With LazyMotion + the `m.*` component, the
//        runtime is ~25KB. Critical for India's 2G/3G users
//        (Rule #22 — 1L users Day 1).
//
//        We do NOT enable `strict` mode yet — existing motion
//        components (fade-in / page-transition / press-scale /
//        stagger-children) use `motion.*`. After Phase 3 refactor
//        migrates them to `m.*`, `strict` can be turned on as a
//        compile-time guard.
//
//   3. <MotionLevelContext.Provider>
//        Composite "effective motion level" — combines OS preference
//        + network quality + (future) battery state. Consumers read
//        this via useMotionLevel() to decide whether to animate at
//        all, or pick a lighter alternative (opacity-only).
//
//   4. PostHog telemetry
//        Reports the active motion level + reason once per change.
//        Lets us measure how many users actually receive reduced
//        motion — a proxy for accessibility reach AND a proxy for
//        the slow-network user base.
//
// Mounted in `app/[locale]/layout.tsx`, INSIDE PostHogProvider and
// OUTSIDE ThemeProvider. See Phase 4 layout integration.
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import { createContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';

// IMPORTANT — direct hook paths (NOT `@/hooks` barrel) to avoid a
// circular dependency. The barrel `apps/web/hooks/index.ts` re-exports
// `useMotionLevel`, which transitively imports this file. Going
// through the barrel here would create a cycle:
//   hooks/index → use-motion-level → motion-config-provider → hooks/index.
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useNetworkQuality } from '@/hooks/use-network-quality';
import { capturePostHogEvent } from '@/lib/posthog';

/**
 * Effective motion level for the running session.
 *
 *   - `'full'`    All animations enabled (the default for healthy
 *                 sessions on good network with no OS preference).
 *   - `'reduced'` Transforms / layout animations off; opacity-only
 *                 allowed. Triggered by user preference OR slow
 *                 network OR future low-power signal.
 *   - `'none'`    No animation at all. Reserved for future
 *                 extreme-low-power / data-saver modes.
 */
export type MotionLevel = 'full' | 'reduced' | 'none';

/**
 * Why the current motion level was selected.
 * Used by useMotionLevel() consumers + by analytics.
 */
export type MotionReason = 'user_pref' | 'slow_network' | 'low_power' | 'full';

export interface MotionLevelContextValue {
  level: MotionLevel;
  reason: MotionReason;
}

/**
 * Default context value — returned when a consumer reads
 * MotionLevelContext OUTSIDE the provider (e.g. in unit tests, or
 * before the provider has mounted during SSR). Safe default:
 * full motion. Real value is set once the provider mounts.
 */
const DEFAULT_VALUE: MotionLevelContextValue = {
  level: 'full',
  reason: 'full',
};

export const MotionLevelContext = createContext<MotionLevelContextValue>(DEFAULT_VALUE);

interface MotionConfigProviderProps {
  children: ReactNode;
}

/**
 * Root motion governance provider. Mount once, near the top of the
 * tree (inside PostHogProvider, outside ThemeProvider).
 *
 * @example
 *   <PostHogProvider>
 *     <MotionConfigProvider>
 *       <ThemeProvider>
 *         {children}
 *       </ThemeProvider>
 *     </MotionConfigProvider>
 *   </PostHogProvider>
 */
export function MotionConfigProvider({ children }: MotionConfigProviderProps) {
  const prefersReduced = useReducedMotion();
  const { isSlow, isOffline } = useNetworkQuality();

  // Resolve the effective motion level.
  // Order matters: user preference wins over network because
  // honoring accessibility is more important than saving bytes.
  const value = useMemo<MotionLevelContextValue>(() => {
    if (prefersReduced) {
      return { level: 'reduced', reason: 'user_pref' };
    }
    if (isSlow || isOffline) {
      return { level: 'reduced', reason: 'slow_network' };
    }
    return { level: 'full', reason: 'full' };
  }, [prefersReduced, isSlow, isOffline]);

  // Telemetry: emit once per (level, reason) change. Guarded with a
  // ref so React StrictMode's double-invocation of effects in dev
  // doesn't produce duplicate events.
  const lastReported = useRef<string | null>(null);
  useEffect(() => {
    const key = `${value.level}:${value.reason}`;
    if (lastReported.current === key) return;
    lastReported.current = key;
    capturePostHogEvent('motion_level_active', {
      level: value.level,
      reason: value.reason,
    });
  }, [value]);

  return (
    <MotionLevelContext.Provider value={value}>
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
    </MotionLevelContext.Provider>
  );
}
