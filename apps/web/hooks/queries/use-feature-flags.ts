// apps/web/hooks/queries/use-feature-flags.ts
// ═══════════════════════════════════════════════════════════════
// useFeatureFlags — Task #47 stub → Task #49 production
// ─────────────────────────────────────────────────────────────────
// Fetches the per-user flag map from `/api/flags`. The backend (see
// `apps/api/src/routes/flags.router.ts`) returns the full evaluated
// map plus context echo + ISO timestamp. We narrow to the flag map
// before handing it to the React tree to keep consumers tiny.
//
// Cache policy:
//   - staleTime: 60s (matches FLAG_CACHE_L2_TTL_SECONDS on the API).
//     Polling at TTL is the simplest convergence path. Admin updates
//     surface within one TTL window.
//   - When the user logs in / out, the `userId` argument changes,
//     which mutates the cache key → automatic refetch with the new
//     identity context (no manual invalidation needed).
//   - On a tab regaining focus, TanStack revalidates automatically;
//     we leave that default on so a sleeping laptop doesn't serve
//     ancient flags after waking.
//
// Why no realtime / SSE:
//   60s convergence is acceptable for Day 1. When traffic earns it,
//   Phase D will add a Server-Sent Events stream and switch this
//   hook to subscribe instead of poll. The hook signature won't
//   change — components remain unmodified.
//
// Reference patterns:
//   - Vercel Flags SDK React hook (same poll-or-SSE switchable model).
//   - LaunchDarkly's `useFlags()` server-flag fallback.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery } from '@tanstack/react-query';
import type { FlagKey, FlagMap } from '@repo/shared';
import { authFetch } from '@/lib/api';
import { ENDPOINTS } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

// ─── Wire shape returned by the backend ─────────────────────────

interface FlagsApiResponse {
  readonly flags: FlagMap;
  readonly context: {
    readonly anonymous: boolean;
    readonly userId: string | null;
    readonly clinicId: string | null;
    readonly region: string | null;
  };
  readonly evaluatedAt: string;
  readonly ttlSeconds: number;
}

// ─── Public surface (kept backwards-compatible) ─────────────────

export type { FlagMap, FlagKey };

/** Legacy alias retained for the Task #47 callers. */
export type FeatureFlagMap = FlagMap;

export interface UseFeatureFlagsOptions {
  /**
   * Pass `null` for anonymous visitors. The hook still fires the
   * /api/flags call (the backend returns the public default set)
   * but skips bearer-token injection.
   */
  readonly userId: string | null;
}

/**
 * Returns the full flag map for the caller. Stale-time defaults to
 * 60 seconds — matching the API's L2 TTL. Components that need an
 * immediate refetch after an admin toggle should call
 * `queryClient.invalidateQueries({ queryKey: queryKeys.flags.all })`.
 */
export function useFeatureFlags(options: UseFeatureFlagsOptions) {
  const { userId } = options;

  return useQuery<FlagMap>({
    queryKey: queryKeys.flags.list(userId),
    queryFn: async ({ signal }) => {
      const response = await authFetch<FlagsApiResponse>(ENDPOINTS.flags.list, {
        method: 'GET',
        signal,
        skipAuth: !userId,
      });
      return response.flags;
    },
    // 60s matches the server's L2 TTL — predictable convergence window.
    staleTime: 60 * 1000,
    // Keep cache around for 1 hour so navigations between pages don't
    // re-fetch every time.
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/**
 * Convenience: returns a single flag value with a default fallback.
 *
 *   const showStreaming = useFeatureFlag('consultation.streaming', {
 *     userId,
 *     fallback: false,
 *   });
 *
 * While the query is in flight, returns the fallback — never `undefined`.
 */
export function useFeatureFlag(
  flag: FlagKey | string,
  options: UseFeatureFlagsOptions & { fallback: boolean },
): boolean {
  const query = useFeatureFlags({ userId: options.userId });
  if (!query.data) return options.fallback;
  const value = query.data[flag];
  return typeof value === 'boolean' ? value : options.fallback;
}

/**
 * Detailed variant: returns flag value + query state for components
 * that want to differentiate "loading" from "false".
 */
export function useFeatureFlagDetail(
  flag: FlagKey | string,
  options: UseFeatureFlagsOptions & { fallback: boolean },
): {
  readonly value: boolean;
  readonly isLoading: boolean;
  readonly isError: boolean;
} {
  const query = useFeatureFlags({ userId: options.userId });
  const value =
    query.data && typeof query.data[flag] === 'boolean'
      ? (query.data[flag] as boolean)
      : options.fallback;
  return {
    value,
    isLoading: query.isPending,
    isError: query.isError,
  };
}
