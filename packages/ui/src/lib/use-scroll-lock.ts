'use client';

import * as React from 'react';

/**
 * useScrollLock — Part 11.9. Locks background scroll while an overlay is open.
 * Hack-free path: `overscroll-behavior: contain` to stop scroll-chaining +
 * `scrollbar-gutter: stable` so locking causes no layout shift (anti-CLS, Part 4).
 * Restores prior values on close. No-op on the server.
 */
export function useScrollLock(active: boolean): void {
  React.useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const root = document.documentElement;
    const prev = {
      overflow: root.style.overflow,
      gutter: root.style.scrollbarGutter,
      overscroll: root.style.overscrollBehavior,
    };
    root.style.overflow = 'hidden';
    root.style.scrollbarGutter = 'stable';
    root.style.overscrollBehavior = 'contain';
    return () => {
      root.style.overflow = prev.overflow;
      root.style.scrollbarGutter = prev.gutter;
      root.style.overscrollBehavior = prev.overscroll;
    };
  }, [active]);
}
