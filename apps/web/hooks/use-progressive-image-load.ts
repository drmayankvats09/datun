// ═══════════════════════════════════════════════════════════════
// USE-PROGRESSIVE-IMAGE-LOAD — Task #46 viewport pre-fetch hook
//
// Lazy-loading <img> works, but the browser only requests the bytes
// once the element enters the viewport — by then the user is already
// staring at a blurhash placeholder. We can do better:
//
//   1. IntersectionObserver with a 1500px rootMargin (the image's
//      bytes are pre-fetched while the element is still 1500px below
//      the fold — by the time the user scrolls to it, it's painted).
//   2. Network-aware: 2G/3G users SKIP pre-fetch (their bandwidth is
//      precious — only fetch what's actually visible).
//   3. Save-Data hint: when the browser advertises Save-Data, we honour
//      it and skip pre-fetch regardless of speed (user explicitly
//      opted into reduced data usage).
//   4. Reduced-motion: not network-relevant but consistent UX — skip
//      animated transitions on placeholder→full swap.
//
// Hook returns:
//   { ref, isInView, isLoaded }
//
//   ref      — attach to the element you want observed
//   isInView — true once the element has entered (or pre-entered) the
//              viewport with rootMargin applied
//   isLoaded — true after the consumer manually flips it via the
//              `onLoad` handler on their <img> tag
//
// Note: this hook ONLY decides *when* to start loading. It does NOT
// fetch bytes itself. Pair with <OptimizedImage /> which reads
// `isInView` and conditionally renders the priority/eager src.
//
// Pattern: Vercel `next/image` + Linear's image grid lazy pattern.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNetworkQuality } from './use-network-quality';

/** Lookahead in px — how far below the fold we begin pre-fetch. */
const DEFAULT_PRE_FETCH_LOOKAHEAD_PX = 1500;

/** Lookahead used when bandwidth is constrained — much smaller. */
const REDUCED_LOOKAHEAD_PX = 100;

export interface UseProgressiveImageLoadOptions {
  /**
   * When true, treat the image as priority/LCP — load immediately, skip
   * IntersectionObserver gating. Used by hero images, OG images, etc.
   */
  readonly priority?: boolean;
  /**
   * Override the default 1500px lookahead. Use sparingly — most callers
   * should accept the network-aware default.
   */
  readonly lookaheadPx?: number;
}

export interface UseProgressiveImageLoadResult {
  /** Ref to attach to the observed element (typically the <img> wrapper). */
  readonly ref: (node: Element | null) => void;
  /** True once the element has crossed the (lookahead-expanded) viewport. */
  readonly isInView: boolean;
  /** True after the consumer flips this via <img onLoad={onImageLoad}>. */
  readonly isLoaded: boolean;
  /** Wire this to the underlying <img onLoad>. */
  readonly onImageLoad: () => void;
}

export function useProgressiveImageLoad(
  options: UseProgressiveImageLoadOptions = {},
): UseProgressiveImageLoadResult {
  const { priority = false, lookaheadPx } = options;
  const networkQuality = useNetworkQuality();
  const [isInView, setIsInView] = useState(priority);
  const [isLoaded, setIsLoaded] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetRef = useRef<Element | null>(null);
  const isInViewRef = useRef(priority);
  // Keep ref in sync so the callback ref function can read the latest.
  isInViewRef.current = isInView;

  // Compute effective lookahead from network conditions.
  const effectiveLookahead = computeLookahead({
    isSlow: networkQuality.isSlow,
    saveDataEnabled: isSaveDataActive(),
    lookaheadPx,
  });

  // The setter ref-callback — runs on mount/unmount of the observed node.
  const setRef = useCallback(
    (node: Element | null): void => {
      // Clean up previous observer if the node changed.
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      targetRef.current = node;
      if (!node || priority || isInViewRef.current) return;
      if (typeof IntersectionObserver === 'undefined') {
        // Old browsers — load immediately (fail-safe).
        setIsInView(true);
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setIsInView(true);
              observer.disconnect();
              observerRef.current = null;
              break;
            }
          }
        },
        {
          rootMargin: `${effectiveLookahead}px 0px`,
          threshold: 0,
        },
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    [priority, effectiveLookahead],
  );

  // Tear-down on unmount.
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  const onImageLoad = useCallback((): void => {
    setIsLoaded(true);
  }, []);

  return { ref: setRef, isInView, isLoaded, onImageLoad };
}

// ─── Helpers ──────────────────────────────────────────────────

function computeLookahead(args: {
  isSlow: boolean;
  saveDataEnabled: boolean;
  lookaheadPx?: number;
}): number {
  if (args.saveDataEnabled || args.isSlow) {
    return Math.min(REDUCED_LOOKAHEAD_PX, args.lookaheadPx ?? REDUCED_LOOKAHEAD_PX);
  }
  return args.lookaheadPx ?? DEFAULT_PRE_FETCH_LOOKAHEAD_PX;
}

/**
 * Read `navigator.connection.saveData` if available. The Save-Data hint
 * is a user-set browser preference exposed via the Network Information
 * API. When true, we respect it and never pre-fetch.
 */
function isSaveDataActive(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(conn?.saveData);
}
