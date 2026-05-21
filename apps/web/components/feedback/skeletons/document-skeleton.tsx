// ═══════════════════════════════════════════════════════════════
// DOCUMENT SKELETON — long-form text page placeholder
//
// MIRRORS
//   • apps/web/app/[locale]/(legal)/privacy/page.tsx
//   • apps/web/app/[locale]/(legal)/terms/page.tsx
//   • apps/web/app/[locale]/(legal)/dpdp-notice/page.tsx
//   • apps/web/app/[locale]/(legal)/cookies/page.tsx
//   • Future: blog / docs / policy / help-center articles.
//
// SHAPE
//   Heading
//   ───────────────────────────────────────────────
//   Body paragraph (3-4 short lines)
//
//   Sub-heading
//   ───────────────────────────────────────────────
//   Body paragraph
//   Body paragraph
//
//   …repeat…
//
// HEIGHT BUDGET ≈ 600 px (3 sections × ~200 px).
// VARIANT       pulse — legal / docs surfaces are low-dwell,
//                       cheap is the right call.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface DocumentSkeletonProps {
  /**
   * How many "section" units (heading + paragraph) to render.
   * Defaults to 3 — covers the above-the-fold view of most
   * legal pages without over-rendering on tier-3 devices.
   */
  sections?: number;

  /** Optional Tailwind classes appended to the outer wrapper. */
  className?: string;
}

/**
 * A document-shaped skeleton with alternating heading and paragraph
 * blocks. Use as the Suspense fallback for any long-form text page.
 */
export function DocumentSkeleton({ sections = 3, className }: DocumentSkeletonProps) {
  return (
    <article
      className={cn('mx-auto w-full max-w-3xl space-y-8 px-4 py-12 sm:px-6', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading document"
    >
      {/* Page title */}
      <div className="space-y-3">
        <Skeleton variant="pulse" className="h-9 w-2/3" />
        <Skeleton variant="pulse" className="h-4 w-1/3" />
      </div>

      {/* Sections */}
      {Array.from({ length: sections }).map((_, idx) => (
        <section key={idx} className="space-y-3">
          <Skeleton variant="pulse" className="h-6 w-1/2" />
          <Skeleton variant="pulse" className="h-4 w-full" />
          <Skeleton variant="pulse" className="h-4 w-11/12" />
          <Skeleton variant="pulse" className="h-4 w-10/12" />
          <Skeleton variant="pulse" className="h-4 w-9/12" />
        </section>
      ))}
    </article>
  );
}
