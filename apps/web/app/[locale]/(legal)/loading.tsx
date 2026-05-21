// ═══════════════════════════════════════════════════════════════
// (LEGAL) GROUP LOADING — Suspense fallback for legal documents
//
// COVERS
//   • /privacy
//   • /terms
//   • /dpdp-notice
//   • /cookies
//   • Any future policy / docs / help-center article placed under
//     `apps/web/app/[locale]/(legal)/`.
//
// SKELETON CHOICE
// ───────────────
// <DocumentSkeleton> renders alternating heading + paragraph blocks
// with `pulse` variant — long-form text surfaces are low-dwell and
// the cheaper opacity-fade is the right call for tier-3 devices.
//
// ROUTE-GROUP REUSE
// ─────────────────
// Same pattern as `(auth)/loading.tsx`: one file covers four pages,
// any future legal route inherits it for free.
//
// Task #51 — Loading skeletons + empty states everywhere.
// ═══════════════════════════════════════════════════════════════

import { DocumentSkeleton } from '@/components/feedback/skeletons';

/**
 * Suspense fallback for all routes under the `(legal)` group.
 *
 * Renders within the default page width — DocumentSkeleton already
 * centers itself with `max-w-3xl mx-auto`, so this wrapper provides
 * only the outer page chrome.
 */
export default function LegalGroupLoading() {
  return (
    <main className="min-h-screen bg-background">
      <DocumentSkeleton />
    </main>
  );
}
