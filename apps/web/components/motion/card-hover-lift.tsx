'use client';

// ═══════════════════════════════════════════════════════════════
// CARD HOVER LIFT — Standardized card hover effect
//
// Wraps a card element so hovering produces a subtle y-translate
// (defaults to -2px). Shadow elevation is handled by Tailwind utility
// classes in the consumer's className — keeping this component
// focused on motion only (composability over coupling).
//
// Why standardise:
//   - Every card across Datun (clinic listings, consultations,
//     prescriptions, appointments) should feel the same. Drift =
//     "amateur" perception.
//   - Reduced-motion users get a no-op wrapper instead of a janky
//     half-translate.
//
// Datun use cases:
//   - Task #59 patient dashboard — consultation history cards
//   - Task #76 /clinics — clinic listing cards
//   - Task #77 pricing — tier cards
//   - Clinic dashboard analytics cards
//   - Prescription history cards
//
// Reduced motion: renders the underlying tag with no animation.
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { DURATION, EASE } from '@repo/shared';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

export interface CardHoverLiftProps {
  children: React.ReactNode;
  className?: string;
  /** Pixels to lift on hover. Negative = up (default -2). */
  liftAmount?: number;
  /** Intrinsic element to render as (default 'div'). */
  as?: 'div' | 'article' | 'section' | 'li';
}

export function CardHoverLift({
  children,
  className,
  liftAmount = -2,
  as = 'div',
}: CardHoverLiftProps) {
  const { isReduced } = useMotionLevel();
  const MotionTag = motion[as] as typeof motion.div;

  if (isReduced) {
    const PlainTag = as;
    return <PlainTag className={cn(className)}>{children}</PlainTag>;
  }

  return (
    <MotionTag
      className={cn(className)}
      initial={{ y: 0 }}
      whileHover={{ y: liftAmount }}
      transition={{ duration: DURATION.fast, ease: EASE.smoothOut }}
    >
      {children}
    </MotionTag>
  );
}
