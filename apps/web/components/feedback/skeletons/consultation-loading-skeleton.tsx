// ═══════════════════════════════════════════════════════════════
// CONSULTATION LOADING SKELETON — /consult/[id] hydration loader
//
// MIRRORS
//   • apps/web/app/[locale]/consult/[id]/page.tsx
//
// THIS REPLACES
//   The bare `h-8 w-8 animate-pulse rounded-full bg-muted` dot that
//   currently renders while Zustand hydrates (line ~41 of the
//   consultation page). That tiny dot reads as "is anything
//   happening?"; this skeleton reads as "your consultation is
//   right here, just loading the last messages".
//
// SHAPE
//   Full-viewport flex container, with a centered card mirroring
//   the post-hydration welcome view:
//     • brand tile (rounded square)
//     • title line
//     • subtitle line
//     • status meta-line
//   …then a chat scaffold below (avatar + 3 text lines).
//
// HEIGHT BUDGET
//   100 vh — fills the viewport. Card sits at top-third optical centre.
//
// VARIANT
//   shimmer — the consultation surface is the heart of Datun.
//   Every patient hits this screen; every clinic demo lives here.
//   The polish is non-negotiable.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface ConsultationLoadingSkeletonProps {
  /** Optional Tailwind classes appended to the outer wrapper. */
  className?: string;
}

/**
 * A full-viewport, brand-aware placeholder for the consultation
 * deep-link page. Holds the layout box stable while the Zustand
 * store hydrates and the consultation resumes from the URL ID.
 */
export function ConsultationLoadingSkeleton({ className }: ConsultationLoadingSkeletonProps) {
  return (
    <main
      className={cn(
        'flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12',
        className,
      )}
      role="status"
      aria-busy="true"
      aria-label="Loading consultation"
    >
      <div className="w-full max-w-lg space-y-6 text-center">
        {/* Brand tile */}
        <Skeleton variant="shimmer" className="mx-auto h-16 w-16 rounded-2xl" />

        {/* Title + ID line */}
        <div className="space-y-3">
          <Skeleton variant="shimmer" className="mx-auto h-7 w-48" />
          <Skeleton variant="shimmer" className="mx-auto h-4 w-64" />
        </div>

        {/* Status / welcome line */}
        <Skeleton variant="shimmer" className="mx-auto h-4 w-56" />

        {/* Mini chat scaffold below — three messages preview */}
        <div className="space-y-4 pt-6 text-left">
          {/* AI message */}
          <div className="flex gap-3">
            <Skeleton variant="shimmer" className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="shimmer" className="h-4 w-48" />
              <Skeleton variant="shimmer" className="h-4 w-64" />
              <Skeleton variant="shimmer" className="h-4 w-36" />
            </div>
          </div>

          {/* User message */}
          <div className="flex justify-end">
            <Skeleton variant="shimmer" className="h-10 w-40 rounded-2xl" />
          </div>

          {/* AI message */}
          <div className="flex gap-3">
            <Skeleton variant="shimmer" className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="shimmer" className="h-4 w-56" />
              <Skeleton variant="shimmer" className="h-4 w-44" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
