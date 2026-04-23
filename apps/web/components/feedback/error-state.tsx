// ═══════════════════════════════════════════════════════════════
// ERROR STATE — Friendly error with retry
// Different from ErrorBoundary: this is for data fetch failures.
// ErrorBoundary = render crashes. ErrorState = API/network errors.
// ═══════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

interface ErrorStateProps {
  /** Error message to display */
  message?: string;
  /** Retry handler */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}
    >
      <div className="bg-destructive/10 mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl">
        😔
      </div>
      <h3 className="text-foreground text-lg font-semibold">Oops!</h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
