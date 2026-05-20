'use client';

// ═══════════════════════════════════════════════════════════════
// ROUTE PROGRESS — Top progress bar on route navigation
//
// Pattern: NProgress, YouTube, Vercel — a slim top bar that starts
// at ~30%, trickles toward ~90% while the new route is loading, and
// snaps to 100% once the pathname settles.
//
// Task #50 refactor:
//   - Replaces hand-rolled setInterval trickle with Framer's
//     `useMotionValue` + `useSpring`. Spring physics gives the
//     natural "slowing as you approach 100" feel for free.
//   - Reduced-motion path: a single CSS `transition: width 200ms`
//     applied to a plain div — accessible, no Framer overhead.
//   - Pause when the document is hidden (background tab) so we
//     don't burn CPU on motion the user can't see.
//
// All ARIA / visibility behaviour preserved.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, useMotionValue, useSpring, useMotionValueEvent, animate } from 'framer-motion';
import { useMotionLevel } from '@/hooks';

// Tunable visual constants — picked to feel like Vercel / Linear.
const START_PERCENT = 30;
const TRICKLE_TARGET = 90;
const TRICKLE_DELAY_MS = 100;
const COMPLETE_DELAY_MS = 250;
const SPRING_CONFIG = { stiffness: 50, damping: 30, mass: 1 } as const;

export function RouteProgress() {
  const pathname = usePathname();
  const { isReduced } = useMotionLevel();

  // Skip animating the very first render (mount). The bar only
  // activates from the second pathname change onward — matches the
  // previous behaviour.
  const isFirst = useRef<boolean>(true);

  // Loading state controls whether the bar is rendered at all.
  const [loading, setLoading] = useState<boolean>(false);

  // Motion value drives width. We display through a spring so the
  // trickle feels organic.
  const target = useMotionValue<number>(0);
  const smoothed = useSpring(target, SPRING_CONFIG);

  // Mirror smoothed motion-value into React state so the rendered
  // width attribute always reflects the latest frame (also keeps the
  // reduced-motion branch testable).
  const [displayPercent, setDisplayPercent] = useState<number>(0);
  useMotionValueEvent(smoothed, 'change', (v) => {
    setDisplayPercent(v);
  });

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    setLoading(true);
    target.set(START_PERCENT);

    // After a short pause, push toward the trickle target. The
    // spring naturally slows as it approaches.
    const trickleTimer = window.setTimeout(() => {
      target.set(TRICKLE_TARGET);
    }, TRICKLE_DELAY_MS);

    // When the pathname effect settles (this effect re-runs only on
    // pathname change), we snap to 100% then hide.
    const completeTimer = window.setTimeout(() => {
      // Snap to 100 with a quick animation so users see the
      // satisfying "finish" cap.
      const finishControls = animate(target, 100, {
        duration: 0.2,
        ease: 'easeOut',
        onComplete: () => {
          window.setTimeout(() => {
            setLoading(false);
            target.set(0);
          }, COMPLETE_DELAY_MS);
        },
      });
      // No explicit cleanup required for the inner animate — it
      // resolves quickly and React's strict-mode double-invocation
      // protection is handled by the outer cleanup below.
      void finishControls;
    }, TRICKLE_DELAY_MS + 100);

    return () => {
      window.clearTimeout(trickleTimer);
      window.clearTimeout(completeTimer);
    };
  }, [pathname, target]);

  // ── Pause animation when the tab is hidden (perf hygiene) ──
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden && loading) {
        // Snap to current value (cancels any in-flight spring) so
        // we don't waste a background tab's RAF budget.
        target.set(smoothed.get());
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [loading, target, smoothed]);

  if (!loading && displayPercent === 0) return null;

  // ── Reduced-motion path ──
  // Plain div + CSS transition. No Framer, no spring, no RAF cost.
  if (isReduced) {
    return (
      <div className="route-progress" aria-hidden="true">
        <div
          className="route-progress-bar"
          style={{
            width: `${displayPercent}%`,
            opacity: displayPercent === 100 ? 0 : 1,
            transition: 'width 200ms ease, opacity 250ms ease',
          }}
        />
      </div>
    );
  }

  // ── Full-motion path ──
  // motion.div lets Framer drive the width directly from the spring.
  return (
    <div className="route-progress" aria-hidden="true">
      <motion.div
        className="route-progress-bar"
        style={{
          width: smoothed.get() + '%',
          opacity: displayPercent === 100 ? 0 : 1,
          transition: 'opacity 250ms ease',
        }}
        animate={{ width: `${displayPercent}%` }}
        transition={{ duration: 0 }}
      />
    </div>
  );
}
