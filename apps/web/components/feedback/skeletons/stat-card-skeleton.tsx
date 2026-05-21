// ═══════════════════════════════════════════════════════════════
// STAT CARD SKELETON — KPI card placeholder
//
// MIRRORS
//   • apps/web/app/[locale]/admin/security/components/stats-cards.tsx
//     (the 4-card row at the top of the security dashboard).
//   • Future clinic dashboard KPI row (Task #80) — revenue today,
//     appointments today, conversion %, ratings average.
//   • Future patient dashboard KPI row.
//
// CARD SHAPE
//   ┌──────────────────────────────────────────┐
//   │ ╶╶╶╶╶╶╶╶╶╶╶╶                  ╶╶╶╶╶     │  label · trend pill
//   │                                          │
//   │ ▇▇▇▇▇▇▇▇                                 │  big number
//   │ ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶                  │  delta line
//   └──────────────────────────────────────────┘
//
// HEIGHT BUDGET ≈ 120 px (matches `<Card>` default padding + 3 rows).
// VARIANT       shimmer — above-the-fold, dwell-heavy surface.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface StatCardSkeletonProps {
  /**
   * How many stat cards to render in a responsive grid. Defaults
   * to 4 — matches the security dashboard's lg-row width.
   */
  count?: number;

  /**
   * Tailwind grid override. Defaults to a responsive
   * 1 / 2 / 4 column flow. Override when nesting inside a custom
   * grid that already controls column count.
   */
  className?: string;
}

/**
 * Responsive grid of KPI-card-shaped shimmer blocks. Each card has
 * a label, big number, and delta sub-line — mirroring every stat
 * card surface in the product.
 */
export function StatCardSkeleton({ count = 4, className }: StatCardSkeletonProps) {
  return (
    <div
      className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading metrics"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton variant="shimmer" className="h-3 w-24" />
              <Skeleton variant="shimmer" className="h-5 w-12 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton variant="shimmer" className="h-8 w-20" />
            <Skeleton variant="shimmer" className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
