// ═══════════════════════════════════════════════════════════════
// USE-BREAKPOINT — Reactive breakpoint detection
// Returns current breakpoint + boolean helpers.
// Uses matchMedia for performance (no resize listener spam).
// Pattern: Chakra UI useBreakpoint, Mantine useMediaQuery.
//
// Usage:
//   const { isMobile, isTablet, isDesktop } = useBreakpoint();
//   if (isMobile) return <MobileLayout />;
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface BreakpointResult {
  /** Current active breakpoint name */
  current: Breakpoint;
  /** < 640px — phones */
  isMobile: boolean;
  /** 640px–1023px — tablets */
  isTablet: boolean;
  /** >= 1024px — laptops + desktops */
  isDesktop: boolean;
  /** >= 1280px — large desktops */
  isWidescreen: boolean;
  /** Touch device (phone/tablet) */
  isTouch: boolean;
}

const BP = { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 } as const;

function getBreakpoint(width: number): Breakpoint {
  if (width >= BP['2xl']) return '2xl';
  if (width >= BP.xl) return 'xl';
  if (width >= BP.lg) return 'lg';
  if (width >= BP.md) return 'md';
  if (width >= BP.sm) return 'sm';
  return 'xs';
}

/**
 * Reactively tracks the current viewport breakpoint.
 * SSR-safe: returns mobile defaults during server render.
 *
 * @example
 * ```tsx
 * const { isMobile, isDesktop } = useBreakpoint();
 * return isMobile ? <MobileNav /> : <DesktopSidebar />;
 * ```
 */
export function useBreakpoint(): BreakpointResult {
  const [state, setState] = useState<BreakpointResult>({
    current: 'xs',
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    isWidescreen: false,
    isTouch: false,
  });

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      const bp = getBreakpoint(w);
      const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      setState({
        current: bp,
        isMobile: w < BP.sm,
        isTablet: w >= BP.sm && w < BP.lg,
        isDesktop: w >= BP.lg,
        isWidescreen: w >= BP.xl,
        isTouch,
      });
    }

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return state;
}
