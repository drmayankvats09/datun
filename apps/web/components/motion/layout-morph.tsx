'use client';

// ═══════════════════════════════════════════════════════════════
// LAYOUT MORPH — Shared-element transition wrapper
//
// Wraps content with Framer's `layoutId` prop, enabling the
// "iOS-style" shared-element transition: when the same `layoutId`
// appears in two different positions across a render, Framer
// smoothly animates the move (position, size, opacity) — as if a
// single element relocated.
//
// Concrete Datun use cases (future tasks):
//   - Task #59 dashboard: clicking a consultation card morphs it
//     into the detail view header.
//   - Task #76 /clinics: clinic card → clinic profile page.
//   - Mobile bottom-nav avatar → profile page hero.
//
// Important:
//   - `layoutId` must be globally unique among currently-mounted
//     instances. Two elements with the same id at the same time
//     causes undefined behavior (Framer warns in dev).
//   - For lists of items, prefix with the entity type
//     (e.g. `consultation:${id}`, `clinic:${slug}`).
//
// Performance:
//   - Layout animations are heavier than transform animations. Use
//     sparingly — at most 1–2 simultaneous morphs per route.
//   - Reduced motion: layout animation disabled (Framer auto-handles
//     via the parent MotionConfig reducedMotion="user" setting).
// ═══════════════════════════════════════════════════════════════

import { m } from 'framer-motion';
import { SPRING } from '@repo/shared';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

export interface LayoutMorphProps {
  children: React.ReactNode;
  /** Globally-unique identifier for the shared-element transition.
   *  Same `layoutId` across two render targets → smooth morph. */
  layoutId: string;
  /** Render as a different intrinsic element (default 'div'). */
  as?: 'div' | 'span' | 'section' | 'article';
  className?: string;
}

export function LayoutMorph({ children, layoutId, as = 'div', className }: LayoutMorphProps) {
  const { isReduced } = useMotionLevel();
  const Tag = m[as] as typeof m.div;

  if (isReduced) {
    // No layout animation under reduced motion — just render the
    // element with the same className so visual styling is preserved.
    const PlainTag = as;
    return <PlainTag className={cn(className)}>{children}</PlainTag>;
  }

  return (
    <Tag layoutId={layoutId} className={cn(className)} transition={SPRING.stiff}>
      {children}
    </Tag>
  );
}
