// apps/web/hooks/mutations/use-logout.ts
// ═══════════════════════════════════════════════════════════════
// useLogout — Task #47 Phase 2
//
// Logout flow:
//   1. POST /api/auth/logout → server revokes the refresh token
//   2. clearTokens()         → wipes localStorage access+refresh
//   3. queryClient.clear()   → purges ALL cached data
//   4. router push           → locale-preserving redirect to /login
//
// Cache purge is NON-NEGOTIABLE (security):
//   - Without it, the next user to log in on the same browser
//     would briefly see the previous user's cached consultations
//     before the new data lands. That's a DPDP-grade violation.
//   - Cross-tab logout is handled via storage events in
//     listenCrossTabAuth (existing) — Phase 3 wires it to call
//     queryClient.clear() too.
//
// Best-effort backend call:
//   We do NOT block the local logout on server response. If the
//   network is down, the user still gets logged out locally;
//   the server-side token expiry will catch up. Stripe's pattern.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { clearTokens } from '@/lib/auth';

const VALID_LOCALE_PREFIXES = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa'] as const;

function currentLocalePrefix(): string {
  if (typeof window === 'undefined') return '';
  const candidate = window.location.pathname.split('/')[1] ?? '';
  return (VALID_LOCALE_PREFIXES as readonly string[]).includes(candidate) ? `/${candidate}` : '';
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<void, Error, void>({
    mutationKey: ['auth.logout'],

    mutationFn: async () => {
      // Best-effort server-side revoke. Failure here must NOT
      // prevent local logout — security policy: client-side wipe
      // is the source of truth.
      try {
        await api.auth.logout();
      } catch {
        /* swallow — local logout still proceeds */
      }
    },

    onSettled: () => {
      clearTokens();
      queryClient.clear();
      router.push(`${currentLocalePrefix()}/login`);
    },
  });
}
