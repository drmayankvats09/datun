'use client';

// ═══════════════════════════════════════════════════════════════
// SHAKE — Form-field error feedback
//
// When `trigger` flips from falsy to truthy, the wrapped content
// performs a brief horizontal shake (damped oscillation, ≤ 0.4s,
// ≤ 8px amplitude). When `trigger` falls back to falsy, the element
// rests at x: 0.
//
// Why this exists:
//   Red error text alone is easy to miss — users scan past it. A
//   subtle motion change in the field itself catches the eye and
//   maps to "no" body-language. Universal pattern across banking
//   apps (HDFC, Kotak), iOS keychain, every Stripe form.
//
// Accessibility:
//   - aria-live region announces the change so screen readers
//     don't depend on the visual.
//   - Reduced motion → no shake, but ARIA still fires.
//
// Usage:
//   <Shake trigger={hasError}>
//     <Input aria-invalid={hasError} />
//   </Shake>
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { shakeVariants } from '@/lib/motion';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

export interface ShakeProps {
  children: React.ReactNode;
  className?: string;
  /** When this flips true, the shake fires once. Resetting to false
   *  prepares it for the next error. */
  trigger: boolean;
  /** Optional screen-reader text announced when shake fires.
   *  Defaults to "Validation error". Pair with field-level aria-invalid
   *  for full accessibility coverage. */
  announceText?: string;
  /** Called when the shake animation completes. */
  onShakeComplete?: () => void;
}

export function Shake({
  children,
  className,
  trigger,
  announceText = 'Validation error',
  onShakeComplete,
}: ShakeProps) {
  const { isReduced } = useMotionLevel();
  const controls = useAnimationControls();
  // Tracks the *previous* trigger value so we only fire on a
  // false → true transition (not on every render where trigger
  // happens to be true).
  const prevTrigger = useRef<boolean>(trigger);

  useEffect(() => {
    if (trigger && !prevTrigger.current && !isReduced) {
      void controls.start('shake').then(() => {
        onShakeComplete?.();
      });
    }
    prevTrigger.current = trigger;
  }, [trigger, controls, isReduced, onShakeComplete]);

  return (
    <>
      <motion.div
        className={cn(className)}
        variants={shakeVariants}
        initial="idle"
        animate={controls}
      >
        {children}
      </motion.div>
      {/* aria-live region — invisible to sighted users, announced to AT */}
      <span role="status" aria-live="polite" className="sr-only">
        {trigger ? announceText : ''}
      </span>
    </>
  );
}
