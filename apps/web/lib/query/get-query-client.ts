// apps/web/lib/query/get-query-client.ts
// ═══════════════════════════════════════════════════════════════
// QUERY CLIENT RESOLVER — Task #47 Phase 1
//
// SSR-safe singleton pattern recommended by TanStack Query for the
// Next.js App Router:
//
//   - Server-side: a FRESH QueryClient per request. Sharing across
//     requests would leak User A's data into User B's render — a
//     medical-data nightmare (DPDP Section 8 violation: purpose
//     limitation, data minimisation).
//   - Browser-side: ONE persistent client per session. Sharing across
//     React's Suspense retries avoids losing the cache when the first
//     render suspends and re-renders.
//
// We deliberately avoid `useState(() => makeQueryClient())` in the
// provider — if React suspends below the provider WITHOUT a Suspense
// boundary in between, useState's lazy init re-fires and the client
// is recreated, losing the cache. Holding the singleton at module
// scope (here) sidesteps that footgun.
//
// Reference:
//   https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
//   https://tanstack.com/query/latest/docs/framework/react/guides/ssr#nextjs-app-router
// ═══════════════════════════════════════════════════════════════

import { isServer, type QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from './query-client';

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    // Always a fresh client on the server. Critical for DPDP —
    // a request-scoped cache cannot leak across users/requests.
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
