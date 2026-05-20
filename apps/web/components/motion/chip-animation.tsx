'use client';

// ═══════════════════════════════════════════════════════════════
// ANIMATED CHIP — Suggestion-pill component for chat AI replies
//
// A single chip with enter / exit / press / hover micro-interactions.
// Designed to be rendered inside an <AnimatePresence> parent so the
// chips can mount and unmount smoothly as the AI surfaces new
// suggestions (Task #56 `/consult` — context-aware 2-4 chips).
//
// Why a dedicated component:
//   - Chips appear and disappear constantly during a chat session.
//     Without exit animation they pop in/out and feel janky.
//   - Spring physics on hover/tap matches the rest of the design
//     system (SPRING.responsive — Stripe / Linear default).
//   - `layoutId` support lets chips morph position when reordered.
//
// Usage pattern (in chat component):
//   <AnimatePresence>
//     {suggestions.map((s) => (
//       <AnimatedChip key={s.id} onClick={() => send(s.text)}>
//         {s.text}
//       </AnimatedChip>
//     ))}
//   </AnimatePresence>
//
// Accessibility:
//   - Renders as a real <button> — keyboard, focus, ARIA all native.
//   - Reduced motion: no scale/fade, but click handler still works.
// ═══════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { SPRING } from '@repo/shared';
import { chipVariants } from '@/lib/motion';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

export interface AnimatedChipProps {
  children: React.ReactNode;
  /** Click handler — fires on tap / Enter / Space */
  onClick?: () => void;
  /** Disabled state — no animations, no click */
  disabled?: boolean;
  /** Shared-layout id for cross-position morph (optional) */
  layoutId?: string;
  className?: string;
  /** Accessible label override (default: children as string) */
  ariaLabel?: string;
}

export function AnimatedChip({
  children,
  onClick,
  disabled = false,
  layoutId,
  className,
  ariaLabel,
}: AnimatedChipProps) {
  const { isReduced } = useMotionLevel();

  // Default chip styling — matches our design system pill shape.
  // Consumers can override entirely via className.
  const baseClasses = cn(
    'inline-flex items-center justify-center',
    'rounded-full border border-border bg-card',
    'px-3.5 py-1.5 text-sm font-medium text-foreground',
    'transition-colors hover:border-primary/40 hover:bg-accent',
    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'focus-visible:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
    className,
  );

  if (isReduced) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={baseClasses}
      >
        {children}
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={baseClasses}
      // Note: framer's `layout` prop conflicts with explicit `layoutId`
      // — pass only one.
      {...(layoutId ? { layoutId } : { layout: true })}
      variants={chipVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      transition={SPRING.responsive}
    >
      {children}
    </motion.button>
  );
}
