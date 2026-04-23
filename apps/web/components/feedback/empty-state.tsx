// ═══════════════════════════════════════════════════════════════
// EMPTY STATE — Beautiful "no data" with CTA
// FAANG pattern: Empty ≠ blank. Empty = opportunity to guide user.
// Notion, Linear, Stripe — sab empty states design karte hain.
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';
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
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}
    >
      <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">
        {icon}
      </div>
      <h3 className="text-foreground text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">{description}</p>

      {actionLabel &&
        (actionHref || onAction) &&
        (actionHref ? (
          <Link
            href={actionHref}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          >
            {actionLabel}
          </button>
        ))}
    </div>
  );
}
