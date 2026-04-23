// ═══════════════════════════════════════════════════════════════
// RESPONSIVE GRID — Auto-column grid
// Mobile: 1 col → Tablet: 2 col → Desktop: 3-4 col
// Clinic listings, lab tests, pharmacy items — sab same grid.
// ═══════════════════════════════════════════════════════════════

import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  /** Max columns on desktop */
  cols?: 2 | 3 | 4;
  /** Gap size */
  gap?: 'sm' | 'md' | 'lg';
}

const colsMap = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

const gapMap = {
  sm: 'gap-3',
  md: 'gap-4 sm:gap-5',
  lg: 'gap-5 sm:gap-6',
};

export function ResponsiveGrid({ children, className, cols = 3, gap = 'md' }: ResponsiveGridProps) {
  return (
    <div className={cn('grid grid-cols-1', colsMap[cols], gapMap[gap], className)}>{children}</div>
  );
}
