'use client';

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE — Beautiful "no data" with CTA
// FAANG pattern: Empty ≠ blank. Empty = opportunity to guide user.
// Notion, Linear, Stripe — sab empty states design karte hain.
//
// Task #50 update:
//   The root container now fades + slides in subtly on mount. Empty
//   states often appear right after a fetch resolves (server returned
//   no rows) — without motion, the user sees a hard "pop" of content
//   appearing. The 0.3s fade smooths the transition.
//
//   Reduced-motion: renders a plain <div> — no animation, no
//   perceived layout shift.
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
import { motion } from 'framer-motion';
import { DURATION, EASE, DISTANCE } from '@repo/shared';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  /** Emoji or icon to display */
  icon?: string;
  /** Main heading */
  title: string;
  /** Description text */
  description: string;
  /** CTA button text */
  actionLabel?: string;
  /** CTA link href */
  actionHref?: string;
  /** CTA click handler (alternative to href) */
  onAction?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: EmptyStateProps) {
  const { isReduced } = useMotionLevel();

  const containerClasses = cn(
    'flex flex-col items-center justify-center px-6 py-16 text-center',
    className,
  );

  // Body content is identical in both branches — extracted for clarity.
  const body = (
    <>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-3xl">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>

      {actionLabel &&
        (actionHref || onAction) &&
        (actionHref ? (
          <Link
            href={actionHref}
            className="mt-6 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="mt-6 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {actionLabel}
          </button>
        ))}
    </>
  );

  if (isReduced) {
    return <div className={containerClasses}>{body}</div>;
  }

  return (
    <motion.div
      className={containerClasses}
      initial={{ opacity: 0, y: DISTANCE.sm }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.moderate, ease: EASE.smoothOut }}
    >
      {body}
    </motion.div>
  );
}
