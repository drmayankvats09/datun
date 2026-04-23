// ═══════════════════════════════════════════════════════════════
// LOADING BUTTON — Button with spinner state
// Width maintained during loading (no layout shift).
// Pattern: Stripe checkout, every FAANG form.
// ═══════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ComponentProps } from 'react';

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean;
  loadingText?: string;
}

export function LoadingButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={loading || disabled} className={cn('relative', className)} {...props}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}
