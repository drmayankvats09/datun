// ═══════════════════════════════════════════════════════════════
// SECURITY DASHBOARD SKELETON — full-page composite loader
//
// MIRRORS
//   • apps/web/app/[locale]/admin/security/page.tsx
//
// COMPOSITION
//   • Header (icon + h1 + subtitle)
//   • StatCardSkeleton  ×4   (today / yesterday / 7d / 30d)
//   • ChartSkeleton          (trend over time)
//   • DataTableSkeleton      (recent violations preview, 5 rows)
//
// Each section is itself a Phase 2 skeleton — this composite is
// thin glue that arranges them in the exact spatial relationship
// of the live dashboard. If a downstream piece changes shape,
// only the leaf skeleton needs the edit; this composite picks it
// up for free.
//
// HEIGHT BUDGET ≈ 990 px
//   80 (header) + 140 (stat row) + 290 (chart) + 480 (preview table)
//
// VARIANT MIX
//   shimmer above the fold (header, stat row, chart) — that is
//   what users see during the first 600 ms after navigation.
//   pulse for the table preview — visually quieter, cheaper, and
//   it is below the fold on mobile in any case.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ChartSkeleton } from './chart-skeleton';
import { DataTableSkeleton } from './data-table-skeleton';
import { StatCardSkeleton } from './stat-card-skeleton';

export interface SecurityDashboardSkeletonProps {
  /** Optional Tailwind classes appended to the outer wrapper. */
  className?: string;
}

/**
 * Full-page skeleton for the security dashboard. Drop into
 * `app/[locale]/admin/security/loading.tsx` as the Suspense
 * fallback, or render conditionally while client-side data fetches.
 */
export function SecurityDashboardSkeleton({ className }: SecurityDashboardSkeletonProps) {
  return (
    <main
      className={cn('container mx-auto max-w-6xl space-y-8 p-6', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading security dashboard"
    >
      {/* Header — icon tile + title + subtitle */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Skeleton variant="shimmer" className="h-6 w-6 rounded-md" />
          <Skeleton variant="shimmer" className="h-8 w-64" />
        </div>
        <Skeleton variant="shimmer" className="h-4 w-96 max-w-full" />
      </header>

      {/* Stat cards row */}
      <StatCardSkeleton count={4} />

      {/* Trend chart section */}
      <section className="space-y-3">
        <Skeleton variant="shimmer" className="h-6 w-40" />
        <ChartSkeleton />
      </section>

      {/* Recent violations preview */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton variant="pulse" className="h-6 w-40" />
          <Skeleton variant="pulse" className="h-8 w-28 rounded-lg" />
        </div>
        <DataTableSkeleton cols={6} rows={5} variant="pulse" />
      </section>
    </main>
  );
}
