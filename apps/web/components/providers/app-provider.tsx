// ═══════════════════════════════════════════════════════════════
// APP PROVIDER — Global client-side initialization
// Runs auth sync, route tracking, cross-tab sync, offline detection.
// Pattern: Clerk/Next-Auth — single provider wraps entire app.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect } from 'react';
import { useAuthSync } from '@/hooks/use-auth-sync';
import { useRouteTracker } from '@/hooks/use-route-tracker';
import { useBeforeunloadSave } from '@/hooks/use-beforeunload-save';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { listenCrossTabAuth } from '@/stores';

export function AppProvider({ children }: { children: React.ReactNode }) {
  // ── Auth sync on mount ──
  useAuthSync();

  // ── Track last visited route ──
  useRouteTracker();

  // ── Save consultation on tab close ──
  useBeforeunloadSave();

  // ── Cross-tab auth sync (logout one tab = logout all) ──
  useEffect(() => {
    const cleanup = listenCrossTabAuth();
    return cleanup;
  }, []);

  // ── Offline banner ──
  const isOnline = useOnlineStatus();

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 right-0 left-0 z-[9999] bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950 shadow-sm print:hidden">
          You&apos;re offline — changes will sync when you reconnect
        </div>
      )}
      {children}
    </>
  );
}
