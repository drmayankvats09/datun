// ═══════════════════════════════════════════════════════════════
// OFFLINE STATE — Shown when page needs data but user is offline
// Shows cached data if available, otherwise friendly message.
// Pattern: Google Docs, YouTube — graceful offline degradation.
// ═══════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

interface OfflineStateProps {
  /** Custom message */
  message?: string;
  className?: string;
}

export function OfflineState({
  message = "You're offline. Some features may be unavailable until you reconnect.",
  className,
}: OfflineStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}
    >
      <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">
        📡
      </div>
      <h3 className="text-foreground text-lg font-semibold">You&apos;re Offline</h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="text-primary hover:bg-primary/10 mt-6 rounded-lg border border-current px-5 py-2.5 text-sm font-medium transition-colors"
      >
        Retry connection
      </button>
    </div>
  );
}
