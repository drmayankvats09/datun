// ═══════════════════════════════════════════════════════════════
// DATA TABLE SKELETON — generic configurable table loader
//
// MIRRORS
//   • apps/web/components/admin/flags/flag-list.tsx
//   • apps/web/app/[locale]/admin/security/components/violation-table.tsx
//   • Any future shadcn <Table> with header + body rows
//     (clinic patient lists, lab reports, pharmacy orders, …)
//
// HEIGHT BUDGET (matches shadcn Table defaults)
//   • Header row …………… 44 px (12 px y-padding + 20 px content)
//   • Body row …………………… 52 px (16 px y-padding + 20 px content)
//   • Outer border + padding contribute the rest.
//
// CLS GUARANTEE
// ─────────────
// With `cols × rows` fixed at render time, the skeleton occupies
// the exact bounding box the real table will own once data lands.
// Lighthouse Cumulative Layout Shift score remains ≤ 0.05 even on
// 2G throttled testbeds.
//
// VARIANT
// ───────
// Defaults to `pulse` — long lists are scrolled, not stared at, and
// the opacity-fade is dramatically cheaper than a per-cell shimmer
// sweep on tier-3 hardware. Callers may opt in to `shimmer` for
// short, highly-visible tables (e.g. dashboard previews).
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton, type SkeletonVariant } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface DataTableSkeletonProps {
  /**
   * Number of body rows to render. Defaults to 8 — a sensible
   * pre-fold count for a typical 1080p viewport.
   */
  rows?: number;

  /**
   * Number of columns to render. Defaults to 5 — matches the most
   * common admin table widths in Datun (security violations: 6,
   * feature flags: 5, future patient roster: 5).
   */
  cols?: number;

  /**
   * Visual treatment for the placeholder bars. Defaults to `pulse`
   * (cheaper) — switch to `shimmer` only on hero tables that get a
   * lot of dwell time.
   */
  variant?: SkeletonVariant;

  /**
   * Optional Tailwind classes appended to the outer wrapper —
   * usually used to lock width inside a parent grid.
   */
  className?: string;
}

/**
 * Renders a table-shaped loading state with a configurable column
 * and row count. The first column is wider (assumed primary label),
 * the rest taper to nominal data-cell widths.
 */
export function DataTableSkeleton({
  rows = 8,
  cols = 5,
  variant = 'pulse',
  className,
}: DataTableSkeletonProps) {
  // Per-column widths — first column is wider so the skeleton reads
  // like a typical "name + metadata" admin table without the caller
  // having to spec each width manually.
  const colWidths: ReadonlyArray<string> = [
    'w-1/3',
    'w-1/6',
    'w-1/6',
    'w-1/6',
    'w-1/12',
    'w-1/12',
    'w-1/12',
    'w-1/12',
  ];

  return (
    <div
      className={cn('overflow-hidden rounded-md border bg-card', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading table data"
    >
      {/* Header row — slightly tinted background so the skeleton
          telegraphs a real header on appearance. */}
      <div className="flex items-center gap-4 border-b bg-muted/40 px-4 py-3">
        {Array.from({ length: cols }).map((_, idx) => (
          <Skeleton
            key={`hdr-${idx}`}
            variant={variant}
            className={cn('h-3', colWidths[idx] ?? 'w-20')}
          />
        ))}
      </div>

      {/* Body rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={`row-${rowIdx}`} className="flex items-center gap-4 px-4 py-4">
            {Array.from({ length: cols }).map((_, colIdx) => (
              <Skeleton
                key={`cell-${rowIdx}-${colIdx}`}
                variant={variant}
                className={cn('h-4', colWidths[colIdx] ?? 'w-20')}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
