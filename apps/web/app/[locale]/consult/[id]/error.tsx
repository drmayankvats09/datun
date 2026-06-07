// apps/web/app/[locale]/consult/[id]/error.tsx
// ═══════════════════════════════════════════════════════════════
// PER-CONSULTATION ERROR PAGE — Task #52 Phase 3 (NEW)
//
// Catches render errors inside the deep-link consultation route:
//   - /consult/abc123
//   - /consult/abc123/photo
//   - /consult/abc123/results
//
// Why this is the MOST important boundary in the route tree:
//   - The consultation page holds the active AI chat — the product's
//     core value. A crash here loses an in-progress consultation if
//     the user reloads. The boundary catching the throw + offering
//     "Try again" gives the user a chance to recover WITHOUT losing
//     in-memory state (Zustand store survives a render-phase reset).
//   - Consultation IDs are HIGH cardinality — Sentry's "issues view"
//     would explode if each route reported as a separate fingerprint.
//     We avoid passing the ID as a Sentry tag; the categoriser keeps
//     fingerprints stable on the error message + category. The route
//     segment tag stays at the static value 'consultation_detail'.
//   - Special category: CONSULTATION_EXPIRED is its own category in
//     Phase 1's taxonomy. The categoriser routes it → 'navigate-home'
//     (the session is gone — staying on the URL is dead end).
//   - The Phase 1 hook `useErrorCategory` returns this strategy and
//     RouteError surfaces "Go home" as the only CTA — patient flow
//     is now: error UI → home → start fresh.
//
// What is NOT caught here:
//   - Auth errors (401) — those propagate to the auth-fetch refresh
//     single-flight layer; only escalate here if the refresh fails.
//   - Network errors during long-poll / SSE — those bubble up to a
//     FeatureBoundary around the chat panel (Phase 5 wiring).
//
// References:
//   - https://nextjs.org/docs/app/api-reference/file-conventions/error
//   - https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary
// ═══════════════════════════════════════════════════════════════

'use client';

import { RouteError } from '@/components/error';

export default function ConsultDetailError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.ReactElement {
  return <RouteError error={error} reset={reset} segment="consultation_detail" />;
}
