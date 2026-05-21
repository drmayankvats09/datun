// ═══════════════════════════════════════════════════════════════
// /admin/flags LOADING — feature flags table skeleton
//
// MIRRORS
//   • apps/web/app/[locale]/admin/flags/page.tsx
//   • apps/web/components/admin/flags/flag-list.tsx
//
// PAGE STRUCTURE (real, post-data)
//   ┌───────────────────────────────────────────────────────────┐
//   │ Feature flags                              [+ New flag]   │
//   │ Toggle releases, run rollouts, kill bad code fast.        │
//   │                                                           │
//   │  [ Active ]   [ Archived ]                                │  tabs
//   │                                                           │
//   │ ┌─────────────────────────────────────────────────────┐   │
//   │ │ Flag │ Category │ Status │ Rollout │ Actions         │   │
//   │ ├─────────────────────────────────────────────────────┤   │
//   │ │ …                                                    │   │
//   │ └─────────────────────────────────────────────────────┘   │
//   └───────────────────────────────────────────────────────────┘
//
// SKELETON COMPOSITION
//   • Header skeleton (title + subtitle + action button)
//   • Tab pills skeleton (2 inline pills)
//   • DataTableSkeleton (5 cols × 8 rows, pulse variant)
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { DataTableSkeleton } from '@/components/feedback/skeletons';

/**
 * Suspense fallback for `/admin/flags`. Mirrors the live page's
 * header, tabs, and table layout for zero CLS.
 */
export default function FlagsLoading() {
  return (
    <main
      className="container mx-auto max-w-6xl space-y-6 p-6"
      role="status"
      aria-busy="true"
      aria-label="Loading feature flags"
    >
      {/* Header — title + subtitle on left, "New flag" CTA on right */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton variant="shimmer" className="h-8 w-56" />
          <Skeleton variant="shimmer" className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton variant="shimmer" className="h-9 w-32 rounded-lg" />
      </header>

      {/* Tab strip — Active / Archived */}
      <div className="flex items-center gap-2">
        <Skeleton variant="shimmer" className="h-9 w-24 rounded-md" />
        <Skeleton variant="shimmer" className="h-9 w-28 rounded-md" />
      </div>

      {/* Table */}
      <DataTableSkeleton cols={5} rows={8} variant="pulse" />
    </main>
  );
}
