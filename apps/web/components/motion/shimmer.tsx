'use client';

// ═══════════════════════════════════════════════════════════════
// SHIMMER — Premium loading-state surface
//
// A rounded rectangle whose background is a horizontal gradient
// sweep that animates left-to-right in a continuous loop. Replaces
// the basic `animate-pulse` (opacity fade) skeleton with the
// pattern users recognise from Instagram, Facebook, YouTube,
// LinkedIn — instantly readable as "content is loading".
//
// API mirrors the shape of <Skeleton /> so adoption is mechanical:
//   - Drop-in replacement: <Shimmer className="h-8 w-32 rounded-md" />
//   - Same Tailwind sizing classes work.
//   - className override allows any custom shape (avatar, line, card).
//
// Theme support:
//   - Uses CSS variables (`--muted`, `--muted-foreground`) so the
//     shimmer adapts to light / dark mode automatically.
//
// Performance:
//   - Animates `background-position` — fully GPU-accelerated.
//   - Single motion.div per shimmer (no extra DOM, no JS loop).
//
// Reduced motion: renders a static muted rectangle (no sweep).
// Slow network is treated as reduced (saves a layer composite).
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { shimmerTransition } from '@/lib/motion';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

export interface ShimmerProps {
  /** Tailwind classes for sizing + radius (e.g. "h-8 w-32 rounded-md") */
  className?: string;
  /** ARIA label for screen readers (default "Loading") */
  ariaLabel?: string;
  /** Children — almost never used; included for parity with Skeleton */
  children?: React.ReactNode;
}

/**
 * Background gradient template — three-stop linear gradient with a
 * brighter band in the middle. Positioning the gradient at -200% and
 * animating to 200% creates a left-to-right sweep across the visible
 * surface (the surface itself is `background-size: 200% 100%`).
 */
const SHIMMER_GRADIENT =
  'linear-gradient(' +
  '90deg, ' +
  'var(--muted) 0%, ' +
  'color-mix(in oklab, var(--muted) 75%, var(--foreground) 8%) 50%, ' +
  'var(--muted) 100%' +
  ')';

export function Shimmer({ className, ariaLabel = 'Loading', children }: ShimmerProps) {
  const { isReduced } = useMotionLevel();

  // Base classes — same default rounding as shadcn Skeleton.
  // Consumers override sizing / radius via className.
  const base = cn('rounded-md bg-muted', className);

  if (isReduced) {
    return (
      <div role="status" aria-label={ariaLabel} aria-busy="true" className={base}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      role="status"
      aria-label={ariaLabel}
      aria-busy="true"
      className={base}
      style={{
        backgroundImage: SHIMMER_GRADIENT,
        backgroundSize: '200% 100%',
        backgroundRepeat: 'no-repeat',
      }}
      initial={{ backgroundPosition: '-200% 0' }}
      animate={{ backgroundPosition: '200% 0' }}
      transition={shimmerTransition}
    >
      {children}
    </motion.div>
  );
}
