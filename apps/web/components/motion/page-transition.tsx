'use client';

// ═══════════════════════════════════════════════════════════════
// PAGE TRANSITION — Subtle fade + slide on route change
//
// Wraps a page's root element. Animates on mount (`animate` prop,
// not `whileInView`) so the page enters from a faded state every
// time it's freshly rendered. Pattern: Notion, Linear — pages
// don't just appear, they fade in.
//
// Task #50 — refactored to use motion design tokens. Public API
// (PageTransitionProps) preserved exactly. Used in Phase 4's
// layout.tsx wrap.
//
// Reduced-motion behavior: plain <div>, no Framer overhead.
// ═══════════════════════════════════════════════════════════════

import { m } from 'framer-motion';
import { DURATION, EASE, DISTANCE } from '@repo/shared';
import { useMotionLevel } from '@/hooks';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const { isReduced } = useMotionLevel();

  if (isReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: DISTANCE.sm }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.moderate, ease: EASE.smoothOut }}
    >
      {children}
    </m.div>
  );
}
