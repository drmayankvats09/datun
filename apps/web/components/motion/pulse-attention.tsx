'use client';

// ═══════════════════════════════════════════════════════════════
// PULSE ATTENTION — Subtle CTA attention-grabber
//
// Wraps children with a gentle 1 → 1.04 → 1 scale pulse that loops a
// configurable number of times before settling. Designed for
// **occasional** emphasis — overuse becomes visual noise.
//
// Datun use cases (sparing, intentional):
//   - "Book Dentist Near Me" CTA when emergency severity detected
//   - "Continue your consultation" prompt after long idle
//   - "Try Datun" hero CTA after 30s idle on landing page
//   - First-time-only onboarding tip pulses
//
// Design constraints:
//   - Default cycle count = 3 (≈ 9 seconds of pulsing, then quiet).
//   - Scale amplitude = 4% (matches Apple HIG "subtle emphasis").
//   - Inter-cycle rest = 1.6s so the pulse feels like breathing,
//     not a jackhammer.
//
// Reduced motion: renders a plain <div>, no pulse, no JS scheduling.
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

export interface PulseAttentionProps {
  children: React.ReactNode;
  className?: string;
  /** Number of pulse cycles. Pass 'infinite' for forever (avoid in production). */
  cycles?: number | 'infinite';
  /** Start automatically on mount (default true). */
  autoStart?: boolean;
  /** Delay before the first pulse begins (seconds). */
  delay?: number;
}

const PULSE_AMPLITUDE = 1.04; // 4% scale increase at peak
const PULSE_DURATION = 1.4; // seconds per single 1 → 1.04 → 1 cycle
const PULSE_REST = 1.6; // seconds between cycles

export function PulseAttention({
  children,
  className,
  cycles = 3,
  autoStart = true,
  delay = 0,
}: PulseAttentionProps) {
  const { isReduced } = useMotionLevel();
  const controls = useAnimationControls();

  useEffect(() => {
    if (!autoStart || isReduced) return;
    const repeat = cycles === 'infinite' ? Infinity : Math.max(0, cycles);

    // Fire-and-forget; React handles cleanup on unmount, and Framer
    // safely no-ops if the target has unmounted by the time the
    // promise resolves.
    void controls.start({
      scale: [1, PULSE_AMPLITUDE, 1],
      transition: {
        duration: PULSE_DURATION,
        delay,
        ease: 'easeInOut',
        repeat,
        repeatDelay: PULSE_REST,
      },
    });
  }, [autoStart, isReduced, cycles, delay, controls]);

  if (isReduced) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div className={cn(className)} animate={controls} initial={{ scale: 1 }}>
      {children}
    </motion.div>
  );
}
