'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ComponentProps } from 'react';

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean;
  loadingText?: string;
  /** Screen reader label shown during loading state. Defaults to "Loading" */
  srLoadingLabel?: string;
}

export function LoadingButton({
  loading = false,
  loadingText,
  srLoadingLabel = 'Loading',
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={loading || disabled}
      aria-busy={loading}
      className={cn('relative', className)}
      {...props}
    >
      {/* P4-F11: Keep content invisible during load — maintains width */}
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingText && <span>{loadingText}</span>}
          <span className="sr-only">{srLoadingLabel}</span>
        </span>
      )}
    </Button>
  );
}
