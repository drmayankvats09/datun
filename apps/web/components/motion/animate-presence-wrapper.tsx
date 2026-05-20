'use client';

// ═══════════════════════════════════════════════════════════════
// ANIMATE PRESENCE WRAPPER — Thin wrapper over Framer's AnimatePresence
//                            with sensible defaults + reduced-motion bypass
//
// Provides:
//   - `mode="wait"` default — exit completes before next enter
//     (avoids two children overlapping during route transitions).
//   - `initial={false}` default — children don't animate on first
//     mount; only on subsequent state changes. Matches what users
//     expect for route transitions and toggleable UI.
//   - Reduced-motion bypass — returns a Fragment, skipping the
//     AnimatePresence machinery entirely. Smaller render tree,
//     no exit-animation wait time.
//
// All Framer AnimatePresence props are pass-through. Use this in
// place of bare <AnimatePresence> across the codebase so reduced-
// motion behaviour stays consistent.
//
// Usage (route transitions):
//   <AnimatePresenceWrapper>
//     <motion.div key={pathname} ...>{children}</motion.div>
//   </AnimatePresenceWrapper>
//
// Usage (conditional mount):
//   <AnimatePresenceWrapper>
//     {open && <SlideInFrom from="bottom" key="sheet">...</SlideInFrom>}
//   </AnimatePresenceWrapper>
//
// Task #50 — Motion Design System.
// ═══════════════════════════════════════════════════════════════

import { AnimatePresence, type AnimatePresenceProps } from 'framer-motion';
import { useMotionLevel } from '@/hooks';

/**
 * Public props. We restate the children-acceptance shape because
 * Framer's `AnimatePresenceProps.children` type can be either a
 * `ReactNode` or specific motion children — we use `ReactNode` here
 * for ergonomic call-sites.
 */
export interface AnimatePresenceWrapperProps extends Omit<AnimatePresenceProps, 'children'> {
  children?: React.ReactNode;
}

export function AnimatePresenceWrapper({
  children,
  mode = 'wait',
  initial = false,
  ...rest
}: AnimatePresenceWrapperProps) {
  const { isReduced } = useMotionLevel();

  if (isReduced) {
    // Skip AnimatePresence entirely. Children that the parent
    // currently renders are shown; mid-exit children are dropped
    // (no need to wait for an animation that's been disabled).
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode={mode} initial={initial} {...rest}>
      {children}
    </AnimatePresence>
  );
}
