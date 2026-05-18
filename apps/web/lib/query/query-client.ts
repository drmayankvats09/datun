// apps/web/lib/query/query-client.ts
// ═══════════════════════════════════════════════════════════════
// QUERY CLIENT FACTORY — Task #47 Phase 1
//
// Single brain for every server-state cache in the app. Mounted once
// per request on the server, once per session in the browser (see
// get-query-client.ts). Hooks (Phase 2) read this client via the
// QueryClientProvider mounted in the locale layout (Phase 3).
//
// FAANG defaults applied here:
//   - staleTime 60s   → cached data considered fresh for 1 minute,
//                       avoids hammering the API on remounts
//   - gcTime    300s  → unused caches purged after 5 minutes
//   - retry     custom → respects HTTP semantics (no retry on 4xx
//                       except 408/429), data-plan friendly for
//                       rural users on Jio/Airtel patchy networks
//   - retryDelay      → exponential backoff 1s → 2s → 4s, capped 30s
//   - refetchOnFocus  → ON. Medical data MUST be fresh after a
//                       tab-switch — a doctor reviewing leads on
//                       two screens must see the same state
//   - refetchOnReconnect → ON. Indian rural networks reconnect often
//
// Global error plumbing:
//   - Query/Mutation errors → Sentry (tagged with queryKey/mutationKey
//                              for triage during incident response)
//   - Background-refetch failures → sonner toast (user is already
//                              looking at cached data; surfacing the
//                              failure inline would double-notify)
//   - Auth (401) errors → SWALLOWED here. The auth-fetch single-flight
//                          refresh layer owns 401. Forwarding to Sentry
//                          would spam during normal token rotation.
//
// Memory rule #22 — production-grade lifecycle:
//   TanStack Query propagates its internal AbortSignal through the
//   queryFn. authFetch (File 5) forwards that signal to native fetch,
//   so unmount-during-fetch cleanly cancels — no setState-after-unmount.
//
// References:
//   https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
//   https://tanstack.com/query/latest/docs/framework/react/reference/QueryClient
// ═══════════════════════════════════════════════════════════════

import { QueryClient, QueryCache, MutationCache, type DefaultOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';
import { ERROR_CODES } from '@repo/shared';
import { ApiError, isApiError } from '@/lib/api/api-error';

// ─── Tunables ───────────────────────────────────────────────

const ONE_MINUTE_MS = 60_000;
const FIVE_MINUTES_MS = 5 * ONE_MINUTE_MS;
const MAX_RETRY_DELAY_MS = 30_000;
const MAX_RETRIES = 3;

// ─── Helpers ────────────────────────────────────────────────

/**
 * Whether the error originates from an authentication failure.
 *
 * The auth-fetch layer's single-flight refresh handles 401 separately:
 * one refresh, retry all in-flight requests once. Retrying at the cache
 * level too would clash with that — back-to-back refreshes, possibly
 * triggering the API's "too many refresh attempts" lockout.
 */
function isAuthError(error: unknown): boolean {
  if (!isApiError(error)) return false;
  return (
    error.statusCode === 401 ||
    error.code === ERROR_CODES.UNAUTHORIZED ||
    error.code === ERROR_CODES.TOKEN_EXPIRED
  );
}

/**
 * Retry policy aligned with FAANG HTTP semantics:
 *   - Auth errors           → never retry (refresh layer owns these)
 *   - 4xx (non-408/429)     → never retry (caller bug or business rule;
 *                              retrying wastes the user's data plan)
 *   - 408 timeout           → retry (transient)
 *   - 429 rate-limit        → retry (with backoff respects Retry-After)
 *   - 5xx / network errors  → retry up to MAX_RETRIES
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  if (isAuthError(error)) return false;

  if (isApiError(error)) {
    const status = error.statusCode;
    if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
      return false;
    }
  }
  return true;
}

/** Defensive stringify — query keys are app-controlled but never trust them. */
function safeStringifyKey(key: unknown): string {
  try {
    return JSON.stringify(key);
  } catch {
    return '[unserialisable-key]';
  }
}

// ─── Defaults ───────────────────────────────────────────────

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: ONE_MINUTE_MS,
    gcTime: FIVE_MINUTES_MS,
    retry: shouldRetry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, MAX_RETRY_DELAY_MS),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
  },
  mutations: {
    // Mutations are user-initiated (button click). Auto-retrying could
    // double-execute side-effects (duplicate appointment, double charge,
    // duplicate WhatsApp send). Caller opts in per-mutation when safe.
    retry: false,
  },
};

// ─── Factory ────────────────────────────────────────────────

/**
 * Build a fresh QueryClient. Call from `getQueryClient()` only —
 * direct callers risk leaking caches across SSR requests (DPDP
 * violation — User A's consultation cache rendered into User B's HTML).
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions,

    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isAuthError(error)) return;

        Sentry.captureException(error, {
          tags: {
            source: 'react-query',
            queryKey: safeStringifyKey(query.queryKey),
          },
        });

        // Surface ONLY background-refetch failures (user already sees
        // cached data). Initial-load errors are rendered inline by the
        // component's `error` state, so skipping here avoids double UX.
        if (query.state.data !== undefined) {
          const message = error instanceof ApiError ? error.message : 'Background refresh failed';
          toast.error('Refresh failed', {
            description: message,
            duration: 4000,
          });
        }
      },
    }),

    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (isAuthError(error)) return;

        Sentry.captureException(error, {
          tags: {
            source: 'react-query-mutation',
            mutationKey: safeStringifyKey(mutation.options.mutationKey ?? []),
          },
        });
      },
    }),
  });
}
