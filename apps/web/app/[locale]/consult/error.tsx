// apps/web/app/[locale]/consult/error.tsx
// ═══════════════════════════════════════════════════════════════
// CONSULT LIST ERROR PAGE — Task #52 Phase 3 (NEW)
//
// Catches render errors inside the `/consult` list view and any
// nested routes that don't have their own error.tsx (the
// per-consultation page DOES have one — see p3-05).
//
// Why a dedicated boundary here:
//   - The consultation list is the primary "what's happening" view
//     for returning patients. A crash here means a returning user
//     can't reach their existing consultations — major revenue +
//     trust hit. Segment-level boundary keeps the side nav intact
//     so they can still start a new consultation.
//   - Errors here are almost always TanStack Query failures
//     (consultations.list returning 5xx, network drop). The
//     categoriser routes both → 'server' / 'network' → "Try again".
//     Phase 1's `useErrorRecovery` calls queryClient.resetQueries on
//     retry, so the list refetches automatically.
//   - We intentionally use the route-level UI (RouteError, size=page)
//     rather than the compact widget — the user is on a top-level
//     route and expects a top-level error treatment.
//
// What is NOT caught here:
//   - Errors INSIDE `/consult/[id]` — that route has its own error.tsx
//   - Network errors during chat streaming — those bubble UP to a
//     FeatureBoundary planted around the chat widget (Phase 5 wiring).
//
// References:
//   - https://nextjs.org/docs/app/api-reference/file-conventions/error
// ═══════════════════════════════════════════════════════════════

'use client';

import { RouteError } from '@/components/error';

export default function ConsultListError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}): React.ReactElement {
  return <RouteError error={error} reset={reset} segment="consult_list" />;
}
