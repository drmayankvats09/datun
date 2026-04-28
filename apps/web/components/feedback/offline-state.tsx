// ═══════════════════════════════════════════════════════════════
// OFFLINE STATE — Shown when page needs data but user is offline
// P5-F10: title + retryLabel props added for i18n support.
// Parent component passes translated strings via props.
// ═══════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

interface OfflineStateProps {
  /** Heading text — parent passes t('common.status.offlineTitle') */
  title?: string;
  /** Body message */
  message?: string;
  /** Retry button text — parent passes t('common.actions.retry') */
  retryLabel?: string;
  className?: string;
}

export function OfflineState({
  title = "You're Offline",
  message = "You're offline. Some features may be unavailable until you reconnect.",
  retryLabel = 'Retry connection',
  className,
}: OfflineStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-3xl">
        📡
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 rounded-lg border border-current px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
      >
        {retryLabel}
      </button>
    </div>
  );
}
