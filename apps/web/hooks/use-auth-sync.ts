// ═══════════════════════════════════════════════════════════════
// USE-AUTH-SYNC — Bridge lib/auth.ts ↔ Zustand auth store
// P3-F9: Network error → 30s retry (not permanent failure)
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores';
import { getAccessToken, getMe, clearTokens } from '@/lib/auth';

const SYNC_TTL_MS = 5 * 60 * 1000; // 5 min
const RETRY_DELAY_MS = 30 * 1000; // 30s after network error

export function useAuthSync(): void {
  const { setUser, clearUser, setLoading, lastSyncedAt, user } = useAuthStore();
  const syncRef = useRef(false);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (syncRef.current) return;
    syncRef.current = true;

    async function syncAuth(): Promise<void> {
      const token = getAccessToken();

      if (!token) {
        clearUser();
        return;
      }

      if (lastSyncedAt && Date.now() - lastSyncedAt < SYNC_TTL_MS) {
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
        // P3-F9: Network error — keep cached user, retry in 30s
        setLoading(false);
        if (user) {
          retryRef.current = setTimeout(() => {
            syncRef.current = false;
            syncAuth();
          }, RETRY_DELAY_MS);
        }
      }
    }

    syncAuth();

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [setUser, clearUser, setLoading, lastSyncedAt, user]);
}
