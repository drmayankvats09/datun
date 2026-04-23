// ═══════════════════════════════════════════════════════════════
// FADE IN — Scroll-triggered fade + slide up animation
// Elements animate as they enter the viewport.
// Pattern: Apple product pages, Stripe landing page.
// Respects prefers-reduced-motion automatically.
// ═══════════════════════════════════════════════════════════════

'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks';
import { cn } from '@/lib/utils';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  /** Direction to animate from */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Distance in pixels */
  distance?: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Delay in seconds */
  delay?: number;
}

const directionMap = {
  up: { y: 1, x: 0 },
  down: { y: -1, x: 0 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
  none: { x: 0, y: 0 },
};

export function FadeIn({
  children,
  className,
  direction = 'up',
  distance = 20,
  duration = 0.5,
  delay = 0,
}: FadeInProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  const dir = directionMap[direction];

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, x: dir.x * distance, y: dir.y * distance }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
