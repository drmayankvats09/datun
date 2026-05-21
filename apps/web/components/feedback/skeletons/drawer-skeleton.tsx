// ═══════════════════════════════════════════════════════════════
// DRAWER SKELETON — Sheet / side-panel content placeholder
//
// MIRRORS
//   • apps/web/app/[locale]/admin/security/components/violation-detail-drawer.tsx
//   • Future patient detail drawer (clinic dashboard).
//   • Future flag history drawer (admin/flags).
//
// SHAPE
//   ┌─────────────────────────────────────────────┐
//   │ Header                                      │
//   │ ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶                  │  title
//   │ ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶                      │  subtitle
//   ├─────────────────────────────────────────────┤
//   │ [Severity badge]                            │  status
//   ├─────────────────────────────────────────────┤
//   │ Field A …………………… ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶          │
//   │ Field B …………………… ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶          │
//   │ Field C …………………… ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶          │
//   │ …                                            │
//   └─────────────────────────────────────────────┘
//
// HEIGHT BUDGET ≈ 60 px header + N × 36 px field rows.
// VARIANT       shimmer — drawer is a focused, dwell-heavy surface.
//
// USAGE
//   Drop inside <SheetContent> while the detail payload fetches.
//   Reuses the same row gridding as the live drawer so the layout
//   does not jump on data arrival.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface DrawerSkeletonProps {
  /**
   * Number of "field row" placeholders. Defaults to 8 — matches
   * the average violation-detail drawer payload (id, createdAt,
   * directive, blocked URI, document URI, IP, user-agent, Sentry).
   */
  fieldCount?: number;

  /**
   * Whether to render a small badge slot under the header.
   * Defaults to true — drawers usually surface a status at the top.
   */
  showBadge?: boolean;

  /** Optional Tailwind classes appended to the outer wrapper. */
  className?: string;
}

/**
 * A drawer-content-shaped skeleton — header, optional status badge,
 * and a list of label/value field rows. Drop inside `<SheetContent>`
 * to match the live drawer's bounding box.
 */
export function DrawerSkeleton({
  fieldCount = 8,
  showBadge = true,
  className,
}: DrawerSkeletonProps) {
  return (
    <div
      className={cn('space-y-6', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading details"
    >
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="shimmer" className="h-6 w-48" />
        <Skeleton variant="shimmer" className="h-4 w-64" />
      </div>

      {/* Optional status badge */}
      {showBadge ? <Skeleton variant="shimmer" className="h-6 w-24 rounded-full" /> : null}

      {/* Field rows — two-column grid matching the live drawer */}
      <div className="divide-y">
        {Array.from({ length: fieldCount }).map((_, idx) => (
          <div key={idx} className="grid grid-cols-[8rem_1fr] items-start gap-2 py-3">
            <Skeleton variant="shimmer" className="h-3 w-24" />
            <Skeleton variant="shimmer" className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
