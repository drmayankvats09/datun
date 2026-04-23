// ═══════════════════════════════════════════════════════════════
// PAGE SHELL — Universal page wrapper
// Every page wrapped in this: consistent padding, max-width,
// safe area, fluid spacing. Labs, pharmacy, clinics — sab yahi use.
// Pattern: Stripe Dashboard, Notion page container.
// ═══════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  /** Max content width — default: 5xl (1024px) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  /** Remove vertical padding */
  noPadding?: boolean;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export function PageShell({
  children,
  className,
  maxWidth = '5xl',
  noPadding = false,
}: PageShellProps) {
  return (
    <div
      id="main-content"
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        maxWidthMap[maxWidth],
        !noPadding && 'py-6 sm:py-8 lg:py-12',
        className,
      )}
    >
      {children}
    </div>
  );
}
