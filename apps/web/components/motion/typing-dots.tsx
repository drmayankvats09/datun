'use client';

// ═══════════════════════════════════════════════════════════════
// TYPING DOTS — "AI is thinking" indicator
//
// Three dots that rise and fall in a continuous wave, evoking a
// human-like "thinking" pause. Critical for Task #56 (`/consult`)
// where the user must perceive the AI as a real doctor working,
// not a slow API responding.
//
// Pattern: WhatsApp typing indicator, iMessage dots, ChatGPT loader.
//
// Performance:
//   - Uses GPU-accelerated `y` transforms only — no layout thrash
//   - Single useReducedMotion check up front (not per-dot)
//   - Pure CSS would also work, but Framer integrates with our
//     reduced-motion governance for free.
//
// Accessibility:
//   - role="status" + aria-label so screen readers announce
//     "AI is thinking" once.
//   - Reduced motion: renders three static dots, no movement.
// ═══════════════════════════════════════════════════════════════

import { m } from 'framer-motion';
import { typingDotVariants } from '@/lib/motion';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

export interface TypingDotsProps {
  /** Visual size preset (default 'md') */
  size?: 'sm' | 'md' | 'lg';
  /** Dot colour — defaults to a muted theme foreground */
  color?: string;
  /** Screen-reader label (default "AI is thinking") */
  ariaLabel?: string;
  className?: string;
}

const SIZE_MAP = {
  sm: { dot: 4, gap: 3 },
  md: { dot: 6, gap: 4 },
  lg: { dot: 8, gap: 6 },
} as const;

// Stagger offset between the three dots — 0.15s feels human;
// 0.1s feels mechanical, 0.25s feels sleepy.
const DOT_STAGGER_SEC = 0.15;

export function TypingDots({
  size = 'md',
  color = 'var(--muted-foreground)',
  ariaLabel = 'AI is thinking',
  className,
}: TypingDotsProps) {
  const { isReduced } = useMotionLevel();
  const { dot, gap } = SIZE_MAP[size];

  if (isReduced) {
    return (
      <span
        role="status"
        aria-label={ariaLabel}
        className={cn('inline-flex items-center', className)}
        style={{ gap }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              width: dot,
              height: dot,
              borderRadius: '9999px',
              backgroundColor: color,
              opacity: 0.6,
            }}
          />
        ))}
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cn('inline-flex items-center', className)}
      style={{ gap }}
    >
      {[0, 1, 2].map((i) => (
        <m.span
          key={i}
          aria-hidden="true"
          style={{
            width: dot,
            height: dot,
            borderRadius: '9999px',
            backgroundColor: color,
            display: 'inline-block',
          }}
          variants={typingDotVariants}
          initial="initial"
          animate="animate"
          // Per-dot stagger — passed as a transition override so we
          // don't pollute the shared variants with index-specific delays.
          transition={{
            duration: 0.9,
            ease: 'easeInOut',
            repeat: Infinity,
            delay: i * DOT_STAGGER_SEC,
          }}
        />
      ))}
    </span>
  );
}
