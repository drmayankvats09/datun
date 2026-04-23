// ═══════════════════════════════════════════════════════════════
// PRESS SCALE — Tactile press effect for interactive elements
// Scale down 0.97 on press, back to 1 on release.
// Pattern: iOS button press, Apple HIG, Material Design ripple alternative.
// ═══════════════════════════════════════════════════════════════

'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks';
import { cn } from '@/lib/utils';

interface PressScaleProps {
  children: React.ReactNode;
  className?: string;
  /** Scale factor on press (default 0.97) */
  scale?: number;
  /** Render as different element */
  as?: 'div' | 'button' | 'a';
}

export function PressScale({ children, className, scale = 0.97, as = 'div' }: PressScaleProps) {
  const prefersReduced = useReducedMotion();
  const Tag = motion[as] as typeof motion.div;

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <Tag
      className={cn('cursor-pointer', className)}
      whileTap={{ scale }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </Tag>
  );
}
