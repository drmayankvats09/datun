'use client';

// ═══════════════════════════════════════════════════════════════
// STAGGER CHILDREN — List items animate one by one
//
// Cards, list items, search results — appear sequentially with a
// configurable delay between each. Pattern: Notion database entries,
// Linear issue list, Vercel project grid.
//
// Task #50 — refactored to use `buildStaggerContainer()` orchestration
// helper + `staggerItemVariants` from the motion design system. Public
// API (props of both <StaggerContainer> and <StaggerItem>) preserved.
//
// Reduced-motion behavior: plain <div> wrappers, items render
// instantly. No Framer overhead.
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { STAGGER } from '@repo/shared';
import { buildStaggerContainer, staggerItemVariants } from '@/lib/motion';
import { useMotionLevel } from '@/hooks';

interface StaggerChildrenProps {
  children: React.ReactNode;
  className?: string;
  /** Delay between each child in seconds */
  stagger?: number;
}

export function StaggerContainer({
  children,
  className,
  stagger = STAGGER.default,
}: StaggerChildrenProps) {
  const { isReduced } = useMotionLevel();

  // Memoize the variants object — buildStaggerContainer is a pure
  // function and re-running it on every render would create a new
  // reference, making Framer re-evaluate its internal cache.
  const variants = useMemo(() => buildStaggerContainer(stagger), [stagger]);

  if (isReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={variants} initial="hidden" animate="visible">
      {children}
    </motion.div>
  );
}

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  const { isReduced } = useMotionLevel();

  if (isReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={staggerItemVariants}>
      {children}
    </motion.div>
  );
}
