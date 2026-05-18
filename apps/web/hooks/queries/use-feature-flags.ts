// apps/web/hooks/queries/use-feature-flags.ts
// ═══════════════════════════════════════════════════════════════
// useFeatureFlags — Task #47 Phase 2 (stub)
//
// Per-user feature flag map. Backend resolves a PostHog (Task #49)
// or own-table lookup and returns a flat string→boolean record.
//
// Cache policy:
//   - staleTime: Infinity → flags rarely change mid-session.
//     Explicit `queryClient.invalidateQueries({ queryKey: queryKeys.flags.all })`
//     triggers a refresh (e.g. after an admin toggle).
//   - The `userId` is woven into the key so logout/login flips
//     re-fetch automatically (logout sets it to null).
//
// Netflix and Spotify use this exact pattern — never poll flags
// in a tight loop; rely on event-driven invalidation.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery } from '@tanstack/react-query';
import { authFetch, ENDPOINTS } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

export type FeatureFlagMap = Readonly<Record<string, boolean>>;

export interface UseFeatureFlagsOptions {
  /**
   * Pass `null` for anonymous users — the hook will hit
   * `/api/flags` without an `X-User-Id` header and the
   * backend will return the public default set.
   */
  readonly userId: string | null;
}

export function useFeatureFlags(options: UseFeatureFlagsOptions) {
  const { userId } = options;

  return useQuery<FeatureFlagMap>({
    queryKey: queryKeys.flags.list(userId),
    queryFn: ({ signal }) =>
      authFetch<FeatureFlagMap>(ENDPOINTS.flags.list, {
        method: 'GET',
        signal,
        // Anonymous → no auth header (skipAuth) so unauthenticated
        // visitors still get the public defaults.
        skipAuth: !userId,
      }),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}

/**
 * Convenience helper — read one flag with a default fallback.
 *
 * Usage:
 *   const showNewChat = useFeatureFlag('new-chat-ui', { userId, fallback: false });
 */
export function useFeatureFlag(
  flag: string,
  options: UseFeatureFlagsOptions & { fallback: boolean },
): boolean {
  const query = useFeatureFlags({ userId: options.userId });
  if (!query.data) return options.fallback;
  return query.data[flag] ?? options.fallback;
}
