'use client';

// ═══════════════════════════════════════════════════════════════
// PRESS SCALE — Tactile press effect for interactive elements
//
// Scale down on press, back to 1 on release; subtle hover lift.
// Pattern: iOS button press, Apple HIG, Stripe / Linear default.
//
// Task #50 — refactored to use SPRING.responsive (stiffness 400,
// damping 30 — the documented Stripe / Linear default). The old
// damping value (17) felt more bouncy; the new value is calmer and
// more premium. Public API (PressScaleProps) preserved exactly.
//
// Reduced-motion behavior: plain <div> wrapper, no animation.
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { SPRING } from '@repo/shared';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

interface PressScaleProps {
  children: React.ReactNode;
  className?: string;
  /** Scale factor on press (default 0.97) */
  scale?: number;
  /** Render as a different intrinsic element */
  as?: 'div' | 'button' | 'a';
}

export function PressScale({ children, className, scale = 0.97, as = 'div' }: PressScaleProps) {
  const { isReduced } = useMotionLevel();
  const Tag = motion[as] as typeof motion.div;

  if (isReduced) {
    // When motion is reduced, render the unanimated equivalent.
    // We still attach `cursor-pointer` so the affordance is preserved.
    const PlainTag = as;
    return <PlainTag className={cn('cursor-pointer', className)}>{children}</PlainTag>;
  }

  return (
    <Tag
      className={cn('cursor-pointer', className)}
      whileTap={{ scale }}
      whileHover={{ scale: 1.01 }}
      transition={SPRING.responsive}
    >
      {children}
    </Tag>
  );
}
