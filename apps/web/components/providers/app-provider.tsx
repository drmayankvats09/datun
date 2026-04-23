// ═══════════════════════════════════════════════════════════════
// APP PROVIDER — Global client-side initialization
// Sentry ErrorBoundary (auto-reports) wraps our ErrorBoundary (custom UI).
// Double protection — if inner crashes, outer still catches + reports.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useAuthSync } from '@/hooks/use-auth-sync';
import { useRouteTracker } from '@/hooks/use-route-tracker';
import { useBeforeunloadSave } from '@/hooks/use-beforeunload-save';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useWebVitals } from '@/hooks/use-web-vitals';
import { listenCrossTabAuth } from '@/stores';
import { SkipToContent } from '@/components/a11y';
import { ErrorBoundary } from '@/components/a11y';
import { RouteProgress } from '@/components/feedback';
import { ViewportIndicator } from '@/components/dev/viewport-indicator';

function SentryFallback({
  error,
  resetError,
}: {
  error: unknown;
  componentStack: string;
  eventId: string;
  resetError: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
        ⚠️
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Something went wrong</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-600 dark:text-gray-400">
        An unexpected error occurred. Please refresh the page.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-gray-100 p-4 text-left text-xs text-red-600 dark:bg-gray-800">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      )}
      <button
        onClick={resetError}
        className="mt-6 rounded-lg bg-[#00A896] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00A896]/90"
      >
        Try again
      </button>
    </div>
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  useAuthSync();
  useRouteTracker();
  useBeforeunloadSave();
  useWebVitals();

  useEffect(() => {
    const cleanup = listenCrossTabAuth();
    return cleanup;
  }, []);

  const isOnline = useOnlineStatus();

  return (
    <Sentry.ErrorBoundary fallback={SentryFallback} showDialog={false}>
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
    </Sentry.ErrorBoundary>
  );
}
