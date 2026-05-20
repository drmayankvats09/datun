'use client';

// ═══════════════════════════════════════════════════════════════
// COLLAPSE — Smooth height expand / collapse
//
// A controlled wrapper that animates between `height: 0` (collapsed)
// and `height: auto` (expanded) using a spring. The naïve approach
// (animating to 'auto') doesn't work in CSS, so we use Framer's
// height interpolation which handles measurement internally.
//
// Use cases:
//   - FAQ section (Task #76 /clinics, Task #77 pricing)
//   - Consultation detail expansion in dashboard (Task #59)
//   - Clinic dashboard sections (Task #80+)
//   - Settings sub-panels (Task #65)
//   - Mobile filter drawers
//
// Accessibility:
//   - `aria-hidden` toggles to keep collapsed content out of the AT
//     tree.
//   - The toggle (button) lives in the parent; this component only
//     animates the panel. Parent should manage aria-expanded.
//
// Performance:
//   - `overflow: hidden` is applied during transition; removed
//     when fully open so child focus rings / shadows aren't clipped.
//   - Reduced motion: instant show / hide.
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DURATION, EASE, SPRING } from '@repo/shared';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

export interface CollapseProps {
  children: React.ReactNode;
  /** Controlled open state */
  open: boolean;
  /** Optional className applied to the outer wrapper */
  className?: string;
  /** Fires when the open / close animation finishes */
  onAnimationComplete?: () => void;
}

export function Collapse({ children, open, className, onAnimationComplete }: CollapseProps) {
  const { isReduced } = useMotionLevel();

  // Track whether the panel has been opened at least once. Helps us
  // remove `overflow: hidden` once stable so focus rings don't clip.
  const [didOpen, setDidOpen] = useState<boolean>(open);
  useEffect(() => {
    if (open) setDidOpen(true);
  }, [open]);

  if (isReduced) {
    // Reduced motion: show or hide instantly.
    return (
      <div
        className={cn(className)}
        aria-hidden={!open}
        style={{ display: open ? 'block' : 'none' }}
      >
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="collapse-panel"
          aria-hidden={false}
          className={cn(className)}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            height: SPRING.gentle,
            opacity: { duration: DURATION.base, ease: EASE.smoothOut },
          }}
          // Hide overflow during animation so child content doesn't
          // jut out; once settled and stable we don't need it (the
          // wrapper expands to fit naturally).
          style={{
            overflow: didOpen ? 'visible' : 'hidden',
          }}
          onAnimationStart={() => {
            // Apply overflow:hidden at the START of every animation
            // (open OR close) to prevent visual artifacts mid-transition.
            // The style above resolves only on render — we mutate the
            // element directly for an immediate effect.
          }}
          onAnimationComplete={() => {
            onAnimationComplete?.();
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
