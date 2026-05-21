// ═══════════════════════════════════════════════════════════════
// CONSULTATION CARD SKELETON — single consultation card placeholder
//
// MIRRORS
//   • Future consultation history drawer card (Task #72).
//   • Same shape used on patient dashboard "recent consultations"
//     side-panel and on the clinic dashboard's per-patient view.
//
// CARD SHAPE
//   ┌──────────────────────────────────────────────────────────┐
//   │ ◯  ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶                  ╶╶╶╶╶╶╶          │
//   │    ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶                          │
//   └──────────────────────────────────────────────────────────┘
//   avatar  · headline (chief complaint)        · timestamp
//           · subline (truncated AI summary)
//
// HEIGHT BUDGET   ……… 88 px per card (12 px y-padding × 2 + 64 px content)
// VARIANT         ……… shimmer (high-traffic surface — patients return
//                              to the history drawer constantly)
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ConsultationCardSkeletonProps {
  /**
   * How many placeholder cards to render. Defaults to 3 — matches
   * the count of visible cards above the fold in the history drawer.
   */
  count?: number;

  /** Optional Tailwind classes appended to the outer wrapper. */
  className?: string;
}

/**
 * Stack of consultation-card-shaped shimmer blocks. Use when the
 * history drawer (or any list of past consultations) is fetching
 * data — the layout will not jump when real cards land.
 */
export function ConsultationCardSkeleton({ count = 3, className }: ConsultationCardSkeletonProps) {
  return (
    <div
      className={cn('space-y-2', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading consultations"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex items-start gap-3 rounded-xl border bg-card p-3">
          {/* Avatar / icon tile */}
          <Skeleton variant="shimmer" className="h-10 w-10 shrink-0 rounded-full" />

          {/* Two-line text area */}
          <div className="min-w-0 flex-1 space-y-2 pt-1">
            <div className="flex items-center justify-between gap-3">
              <Skeleton variant="shimmer" className="h-4 w-2/3" />
              <Skeleton variant="shimmer" className="h-3 w-12 shrink-0" />
            </div>
            <Skeleton variant="shimmer" className="h-3 w-11/12" />
          </div>
        </div>
      ))}
    </div>
  );
}
