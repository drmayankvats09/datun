// ═══════════════════════════════════════════════════════════════
// CLINIC CARD SKELETON — clinic listing card placeholder
//
// MIRRORS
//   • Future clinic dashboard listing cards (Task #80).
//   • Patient-facing "find a clinic" search results (Task #100).
//
// SHAPE
//   ┌──────────────────────────────────────────┐
//   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← cover image
//   ├──────────────────────────────────────────┤
//   │  ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶                       │  clinic name
//   │  ⭐ ╶╶╶╶ · ╶╶╶╶╶                         │  rating + reviews
//   │  ╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶╶                │  address
//   │  ╶╶╶╶╶╶╶╶╶╶                              │  distance / fees
//   │                                          │
//   │  [   View profile   ]                    │  CTA
//   └──────────────────────────────────────────┘
//
// HEIGHT BUDGET ≈ 280 px (160 cover + 120 body)
// VARIANT       shimmer — discovery surface, high dwell time.
//
// GRID USAGE
//   Wrap in `<div className="grid grid-cols-1 sm:grid-cols-2
//   lg:grid-cols-3 gap-4">` to mirror the live clinic list grid.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ClinicCardSkeletonProps {
  /**
   * Number of placeholder cards to render. Defaults to 6 — fills
   * a typical 3-column grid above the fold without scroll.
   */
  count?: number;

  /** Optional Tailwind classes appended to the grid wrapper. */
  className?: string;
}

/**
 * Renders a responsive grid of clinic-card-shaped shimmer blocks.
 * Each card holds the cover image bar, name, rating, address,
 * and a CTA button, matching the dimensions of the live card.
 */
export function ClinicCardSkeleton({ count = 6, className }: ClinicCardSkeletonProps) {
  return (
    <div
      className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading clinics"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="overflow-hidden rounded-xl border bg-card">
          {/* Cover image area */}
          <Skeleton variant="shimmer" className="h-40 w-full rounded-none" />

          {/* Body */}
          <div className="space-y-3 p-4">
            {/* Clinic name */}
            <Skeleton variant="shimmer" className="h-5 w-3/4" />

            {/* Rating + reviews */}
            <div className="flex items-center gap-2">
              <Skeleton variant="shimmer" className="h-4 w-20" />
              <Skeleton variant="shimmer" className="h-3 w-16" />
            </div>

            {/* Address */}
            <Skeleton variant="shimmer" className="h-3 w-full" />

            {/* Distance / fees */}
            <Skeleton variant="shimmer" className="h-3 w-1/2" />

            {/* CTA button */}
            <Skeleton variant="shimmer" className="mt-2 h-9 w-32 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
