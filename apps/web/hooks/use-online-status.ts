// ═══════════════════════════════════════════════════════════════
// USE-ONLINE-STATUS — Network detection for India mobile reality
// 95% Indian users = mobile. Phone call → app background →
// network drops → reconnects. This hook tracks it.
// Pattern: Google Docs, Notion — "You're offline" banner.
//
// Initial state ALWAYS assumes ONLINE so the banner never flashes on load:
//  • SSR and the first client render agree on `true` (no hydration mismatch).
//  • navigator.onLine is read only AFTER paint (in the effect), and only flips
//    to offline if the page genuinely loaded offline.
//  • Thereafter the banner reacts to real `online` / `offline` events.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';

/**
 * Returns current online/offline status. Starts `true` (online) and updates on
 * real network events, so a genuinely-online load shows no offline-banner flash.
 *
 * @example
 * const isOnline = useOnlineStatus();
 * if (!isOnline) return <OfflineBanner />;
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    // Page may have loaded while already offline (no event would fire). Only
    // flip in that case — never flash a banner on a normal online load.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIsOnline(false);
    }

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
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
