// apps/web/hooks/queries/use-current-user.ts
// ═══════════════════════════════════════════════════════════════
// useCurrentUser — Task #47 Phase 2
//
// Fetches the currently logged-in user from /api/auth/me.
//
// Used in:
//   - <Header> (avatar + name)
//   - Side drawer (greeting + medical history link)
//   - Dashboard (role-gated UI: patient vs clinic-staff)
//   - Profile page (Task #25)
//   - useAuthSync replacement (Phase 3 wires this — for now both coexist)
//
// Cache policy:
//   - staleTime 5 min: user identity rarely changes within a session
//   - gcTime 30 min: keep cached even when no consumer is mounted,
//                    so a re-mount after a brief unmount is instant
//   - Auth errors are swallowed at the QueryClient level (auth-fetch
//     owns refresh); they never reach this hook's `error` state.
//
// Enable gating:
//   Callers can pass `enabled: false` to skip the network call when
//   no access token is present yet (e.g. on the login page itself).
//   Defaults to `true` so most consumers don't think about it.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useQuery } from '@tanstack/react-query';
import type { AuthUser } from '@repo/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export interface UseCurrentUserOptions {
  /** When `false`, the hook does not fire. Default `true`. */
  readonly enabled?: boolean;
}

export function useCurrentUser(options: UseCurrentUserOptions = {}) {
  const { enabled = true } = options;

  return useQuery<AuthUser>({
    queryKey: queryKeys.auth.me(),
    queryFn: ({ signal }) => api.auth.me({ signal }),
    enabled,
    staleTime: FIVE_MINUTES_MS,
    gcTime: THIRTY_MINUTES_MS,
  });
}
