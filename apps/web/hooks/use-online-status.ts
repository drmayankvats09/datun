// ═══════════════════════════════════════════════════════════════
// USE-ONLINE-STATUS — Network detection for India mobile reality
// 95% Indian users = mobile. Phone call → app background →
// network drops → reconnects. This hook tracks it.
// Pattern: Google Docs, Notion — "You're offline" banner.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true; // SSR assumes online
}

/**
 * Returns current online/offline status.
 * Reactively updates when network state changes.
 *
 * @example
 * const isOnline = useOnlineStatus();
 * if (!isOnline) return <OfflineBanner />;
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hook to run callbacks on network status change.
 * Useful for: re-sync on reconnect, pause uploads on disconnect.
 */
export function useNetworkEffect(onOnline?: () => void, onOffline?: () => void): void {
  useEffect(() => {
    const handleOnline = () => onOnline?.();
    const handleOffline = () => onOffline?.();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onOnline, onOffline]);
}
