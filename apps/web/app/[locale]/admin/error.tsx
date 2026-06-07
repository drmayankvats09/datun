// apps/web/app/[locale]/admin/error.tsx
// ═══════════════════════════════════════════════════════════════
// ADMIN ROOT ERROR PAGE — Task #52 Phase 3 (NEW)
//
// Catches render errors inside the `/admin` subtree that don't have
// a more specific child boundary (admin/label has its own; admin/
// security has its own — see p3-07):
//   - /admin
//   - /admin/flags
//
// Why a dedicated admin boundary:
//   - Admin sessions are high-value but LOW frequency (a handful of
//     staff users). Failures here often indicate config drift
//     (e.g., a flag schema mismatch) — we want them surfaced fast
//     in Sentry with `segment=admin` tag for prioritised triage.
//   - Admin pages bypass several public-page guardrails (e.g.,
//     PostHog identify, certain feature flags). A crash inside admin
//     should NOT crash the user-facing tree — segment-level boundary
//     enforces this isolation.
//   - The categoriser routes 403 (admin permission denied) → 'auth'.
//     The boundary's "Sign in again" CTA correctly redirects the
//     staff member to /login with their role context preserved.
//
// References:
//   - https://nextjs.org/docs/app/api-reference/file-conventions/error
// ═══════════════════════════════════════════════════════════════

'use client';

import { RouteError } from '@/components/error';

export default function AdminRootError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.ReactElement {
  return <RouteError error={error} reset={reset} segment="admin_root" />;
}
