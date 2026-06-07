// apps/web/app/[locale]/(legal)/error.tsx
// ═══════════════════════════════════════════════════════════════
// LEGAL ROUTE GROUP ERROR PAGE — Task #52 Phase 3 (NEW)
//
// Catches render errors inside the `(legal)` route group:
//   - /privacy
//   - /terms
//   - /cookies
//   - /dpdp-notice
//
// Why a dedicated boundary for the legal segment:
//   - DPDP Act 2023 Section 5 requires the Privacy Notice to be
//     "available at all times" — a crashed /privacy page is a
//     compliance risk, not just a UX glitch. Segment-tagging in
//     Sentry lets compliance ops triage legal-page crashes ahead
//     of normal product bugs.
//   - Legal pages have NO data dependencies (pure MDX/JSON), so a
//     crash here means a build or rendering bug — not a network
//     issue. Categorisation will surface "Try again" which kicks the
//     framework's reset → router.refresh, re-attempting render.
//   - Keeping the legal layout (header navigation, last-updated
//     timestamp) mounted via segment boundary means users can pivot
//     to another legal page without leaving the section.
//
// References:
//   - DPDP Act 2023, Section 5(1) — availability of notice
//   - https://nextjs.org/docs/app/api-reference/file-conventions/error
// ═══════════════════════════════════════════════════════════════

'use client';

import { RouteError } from '@/components/error';

export default function LegalError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.ReactElement {
  return <RouteError error={error} reset={reset} segment="legal" />;
}
