// ═══════════════════════════════════════════════════════════════
// USE-REDUCED-MOTION — Accessibility: respect motion preference
// Users with vestibular disorders, motion sickness, or epilepsy
// enable "Reduce Motion" in OS settings. We MUST respect it.
// WCAG 2.1 SC 2.3.3 — Animation from Interactions.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void): () => void {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(query).matches;
}

function getServerSnapshot(): boolean {
  return false; // SSR assumes animations enabled
}

/**
 * Returns true if user prefers reduced motion.
 * Use to disable animations, parallax, auto-playing videos.
 *
 * @example
 * const prefersReduced = useReducedMotion();
 * const animationDuration = prefersReduced ? 0 : 300;
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
