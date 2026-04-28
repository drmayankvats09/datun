// ═══════════════════════════════════════════════════════════════
// APP PROVIDER — Global client-side initialization
// Sentry ErrorBoundary (auto-reports) wraps our ErrorBoundary (custom UI).
// Double protection — if inner crashes, outer still catches + reports.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';
import { SentryFallback } from '@/components/feedback/sentry-fallback';
import { useRouteTracker } from '@/hooks/use-route-tracker';
import { useBeforeunloadSave } from '@/hooks/use-beforeunload-save';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useWebVitals } from '@/hooks/use-web-vitals';
import { listenCrossTabAuth } from '@/stores';
import { SkipToContent } from '@/components/a11y';
import { ErrorBoundary } from '@/components/a11y';
import { RouteProgress } from '@/components/feedback';
import { useAuthSync } from '@/hooks/use-auth-sync';
import { ViewportIndicator } from '@/components/dev/viewport-indicator';

export function AppProvider({ children }: { children: React.ReactNode }) {
  useAuthSync();
  useRouteTracker();
  useBeforeunloadSave();
  useWebVitals();
  const t = useTranslations('common.status');

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
          <div
            role="status"
            className="fixed top-0 right-0 left-0 z-[9999] bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950 shadow-sm print:hidden"
          >
            📡 {t('offline')}
          </div>
        )}
        {children}
        <ViewportIndicator />
      </ErrorBoundary>
    </Sentry.ErrorBoundary>
  );
}
