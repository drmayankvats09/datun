// ═══════════════════════════════════════════════════════════════
// USE-AUTH-SYNC — Bridge lib/auth.ts ↔ Zustand auth store
// On page load: token exists? → fetch user → populate store.
// Runs ONCE on mount. 5-min cache to avoid hammering API.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores';
import { getAccessToken, getMe, clearTokens } from '@/lib/auth';

export function useAuthSync(): void {
  const { setUser, clearUser, setLoading, lastSyncedAt } = useAuthStore();
  const syncRef = useRef(false);

  useEffect(() => {
    if (syncRef.current) return;
    syncRef.current = true;

    async function syncAuth() {
      const token = getAccessToken();

      if (!token) {
        clearUser();
        return;
      }

      // Skip if synced recently (5 min cache)
      if (lastSyncedAt && Date.now() - lastSyncedAt < 5 * 60 * 1000) {
        setLoading(false);
        return;
      }

      try {
        const result = await getMe();
        if (result.success && result.data) {
          setUser(result.data);
        } else {
          clearTokens();
          clearUser();
        }
      } catch {
        // Network error — use cached store data
        setLoading(false);
      }
    }

    syncAuth();
  }, [setUser, clearUser, setLoading, lastSyncedAt]);
}
