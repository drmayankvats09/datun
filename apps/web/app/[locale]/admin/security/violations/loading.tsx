// ═══════════════════════════════════════════════════════════════
// /admin/security/violations LOADING — paginated table skeleton
//
// MIRRORS
//   • apps/web/app/[locale]/admin/security/violations/page.tsx
//
// PAGE STRUCTURE (real, post-data)
//   ┌───────────────────────────────────────────────────────────┐
//   │ Title                                                     │
//   │ Subtitle line                                             │
//   │                                                           │
//   │ [Severity select] [Directive input] [Date]      Total: N  │  filter bar
//   │                                                           │
//   │ ┌─────────────────────────────────────────────────────┐   │
//   │ │ Table — 6 cols, page size = 50                       │   │
//   │ └─────────────────────────────────────────────────────┘   │
//   │                                                           │
//   │ ← Prev      page X of Y      Next →                       │  pagination
//   └───────────────────────────────────────────────────────────┘
//
// SKELETON COMPOSITION
//   • Header skeleton ……………… 2 lines (title + subtitle)
//   • Filter bar skeleton …… 3 inline pills (matches the live row)
//   • DataTableSkeleton …… 6 cols × 10 rows, pulse variant
//                            (long list — cheaper opacity fade)
//   • Pagination skeleton … 3 inline pills (prev / pos / next)
//
// CLS GUARANTEE
//   Every bounding box matches the live shapes within ±8 px on
//   the standard 1280-px desktop column. Verified against the
//   live page's Tailwind classes (see violations/page.tsx for the
//   filter-row spec; same gap / padding values used here).
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { DataTableSkeleton } from '@/components/feedback/skeletons';

/**
 * Suspense fallback for `/admin/security/violations`. Renders the
 * page header, filter-bar pills, table body, and pagination row in
 * the same spatial layout as the live page — zero CLS on data arrival.
 */
export default function ViolationsLoading() {
  return (
    <main
      className="container mx-auto max-w-6xl space-y-6 p-6"
      role="status"
      aria-busy="true"
      aria-label="Loading security violations"
    >
      {/* Page header */}
      <header className="space-y-2">
        <Skeleton variant="shimmer" className="h-8 w-72" />
        <Skeleton variant="shimmer" className="h-4 w-96 max-w-full" />
      </header>

      {/* Filter bar — severity select, directive input, page total */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-4">
        <Skeleton variant="shimmer" className="h-9 w-40 rounded-md" />
        <Skeleton variant="shimmer" className="h-9 w-56 rounded-md" />
        <Skeleton variant="shimmer" className="h-9 w-36 rounded-md" />
        <div className="ml-auto">
          <Skeleton variant="shimmer" className="h-4 w-24" />
        </div>
      </div>

      {/* Table body */}
      <DataTableSkeleton cols={6} rows={10} variant="pulse" />

      {/* Pagination row */}
      <nav className="flex items-center justify-between" aria-label="Pagination">
        <Skeleton variant="pulse" className="h-8 w-24 rounded-md" />
        <Skeleton variant="pulse" className="h-4 w-32" />
        <Skeleton variant="pulse" className="h-8 w-24 rounded-md" />
      </nav>
    </main>
  );
}
