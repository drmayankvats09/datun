// ═══════════════════════════════════════════════════════════════
// CHART SKELETON — Recharts line / bar chart placeholder
//
// MIRRORS
//   • apps/web/app/[locale]/admin/security/components/violation-chart.tsx
//   • Future analytics charts on clinic + patient dashboards.
//
// SHAPE
//   ┌────────────────────────────────────────────────┐
//   │                                                │   ← y-axis labels (left)
//   │   ╱╲      ╱╲    ╱─╲                            │   chart body
//   │  ╱  ╲    ╱  ╲  ╱   ╲                           │
//   │ ╱    ╲__╱    ╲╱     ╲___╱╲                     │
//   │ ─────────────────────────────────              │   ← x-axis labels (bottom)
//   └────────────────────────────────────────────────┘
//
// We don't shimmer the chart curve itself — instead a single large
// muted block sits where the SVG will render. Recharts mounts and
// the curve materialises in ~200 ms, which feels faster than
// shimmering a fake curve.
//
// HEIGHT BUDGET ≈ 256 px chart body + 16 px padding × 2 = ~288 px.
// VARIANT       pulse — charts re-fetch on filter change often;
//                       cheaper opacity-fade is the right call.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ChartSkeletonProps {
  /**
   * Height of the chart body in Tailwind units. Defaults to `h-64`
   * (256 px) — matches the security dashboard chart and most
   * Recharts ResponsiveContainer defaults.
   */
  heightClass?: string;

  /** Optional Tailwind classes appended to the outer wrapper. */
  className?: string;
}

/**
 * A chart-shaped loading placeholder — a card frame with a muted
 * block standing in for the SVG curve. Use inside the same outer
 * wrapper the live chart occupies to keep the layout box stable.
 */
export function ChartSkeleton({ heightClass = 'h-64', className }: ChartSkeletonProps) {
  return (
    <div
      className={cn('rounded-md border bg-card p-4', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading chart"
    >
      {/* Optional chart-title row */}
      <div className="mb-4 flex items-center justify-between">
        <Skeleton variant="pulse" className="h-4 w-32" />
        <Skeleton variant="pulse" className="h-3 w-20" />
      </div>

      {/* Chart body — single block; curve animates in on mount */}
      <Skeleton variant="pulse" className={cn('w-full rounded-md', heightClass)} />

      {/* Legend row */}
      <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Skeleton variant="pulse" className="h-2 w-2 rounded-full" />
          <Skeleton variant="pulse" className="h-3 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton variant="pulse" className="h-2 w-2 rounded-full" />
          <Skeleton variant="pulse" className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}
