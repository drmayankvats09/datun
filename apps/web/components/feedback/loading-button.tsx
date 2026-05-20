'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CheckMark } from '@/components/motion';
import type { ComponentProps } from 'react';

// ═══════════════════════════════════════════════════════════════
// LOADING BUTTON — Submit-state button (loading + success)
//
// Existing contract preserved (loading, loadingText, srLoadingLabel).
//
// Task #50 additions:
//   - `success` prop — when true, render an animated <CheckMark>
//     over the button label. Pair with `loading=false` so the user
//     sees the "checkmark drawn" moment instead of an indefinite
//     spinner.
//   - `successLabel` / `srSuccessLabel` — visible label + screen-
//     reader text for the success state.
//
// Typical state lifecycle:
//   idle  →  loading  →  success  →  (consumer resets to idle or
//                                     navigates away)
//
// Width stability: both loading and success layers render absolutely
// over the children span which is visually hidden — the button keeps
// its width across states, no layout shift.
// ═══════════════════════════════════════════════════════════════

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  /** Show spinner over the label */
  loading?: boolean;
  /** Inline label shown next to the spinner (e.g., "Saving…") */
  loadingText?: string;
  /** Screen-reader label during loading (default "Loading") */
  srLoadingLabel?: string;
  /** Show animated checkmark over the label */
  success?: boolean;
  /** Inline label shown next to the checkmark (e.g., "Saved!") */
  successLabel?: string;
  /** Screen-reader label during success (default "Success") */
  srSuccessLabel?: string;
}

export function LoadingButton({
  loading = false,
  loadingText,
  srLoadingLabel = 'Loading',
  success = false,
  successLabel,
  srSuccessLabel = 'Success',
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  // Single source of truth for "is this button currently animating
  // its own state?" — used to gate aria-busy and disabled.
  const isBusy = loading || success;

  return (
    <Button
      disabled={isBusy || disabled}
      aria-busy={loading}
      className={cn('relative', className)}
      {...props}
    >
      {/* Keep the children rendered (invisible) during loading or
          success states so the button preserves its natural width. */}
      <span className={cn('inline-flex items-center gap-2', isBusy && 'invisible')}>
        {children}
      </span>

      {loading && !success && (
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingText && <span>{loadingText}</span>}
          <span className="sr-only">{srLoadingLabel}</span>
        </span>
      )}

      {success && (
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <CheckMark size="sm" color="currentColor" ariaLabel={srSuccessLabel} />
          {successLabel && <span>{successLabel}</span>}
          <span className="sr-only">{srSuccessLabel}</span>
        </span>
      )}
    </Button>
  );
}
