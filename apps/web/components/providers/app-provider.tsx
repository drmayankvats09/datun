// ═══════════════════════════════════════════════════════════════
// APP PROVIDER — Global client-side initialization
// Auth sync, route tracking, cross-tab sync, offline detection,
// route progress bar, skip-to-content, error boundary.
// Pattern: Clerk/Next-Auth — single provider wraps entire app.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect } from 'react';
import { useAuthSync } from '@/hooks/use-auth-sync';
import { useRouteTracker } from '@/hooks/use-route-tracker';
import { useBeforeunloadSave } from '@/hooks/use-beforeunload-save';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { listenCrossTabAuth } from '@/stores';
import { SkipToContent } from '@/components/a11y';
import { ErrorBoundary } from '@/components/a11y';
import { RouteProgress } from '@/components/feedback';
import { ViewportIndicator } from '@/components/dev/viewport-indicator';

export function AppProvider({ children }: { children: React.ReactNode }) {
  useAuthSync();
  useRouteTracker();
  useBeforeunloadSave();

  useEffect(() => {
    const cleanup = listenCrossTabAuth();
    return cleanup;
  }, []);

  const isOnline = useOnlineStatus();

  return (
    <ErrorBoundary>
      <SkipToContent />
      <RouteProgress />
      {!isOnline && (
        <div className="fixed top-0 right-0 left-0 z-[9999] bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950 shadow-sm print:hidden">
          You&apos;re offline — changes will sync when you reconnect
        </div>
      )}
      {children}
      <ViewportIndicator />
    </ErrorBoundary>
  );
}
