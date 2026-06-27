// apps/web/components/providers/app-provider.tsx
// ═══════════════════════════════════════════════════════════════
// APP PROVIDER — Global client-side initialization (UPGRADED — Task #52 Phase 5)
//
// What this file wires (in mount order):
//   1. <SentryUserContext />     — attaches userId/role tag to Sentry
//   2. useEffect — service worker registration (prod only)
//   3. listenCrossTabAuth        — multi-tab auth coordination
//   4. <Sentry.ErrorBoundary>    — outermost catch (auto-reports)
//   5. <ErrorBoundary level="app"> — Datun's custom boundary (uses
//                                    Phase 1 categorisation + audit)
//   6. <SkipToContent />         — a11y skip link
//   7. <RouteProgress />         — top-bar progress indicator
//   8. {!isOnline} banner        — kept as fast feedback during navigation
//   9. {children}                — actual page content
//   10. <ViewportIndicator />    — dev-only viewport size badge
//
// Phase 5 changes vs v1:
//   - Added <SentryUserContext /> mount — Phase 1 file that subscribes
//     to the auth store and applies PII-safe Sentry user scope.
//   - Added registerServiceWorker() call inside the existing useEffect.
//   - Inner <ErrorBoundary> now passes `level="app"` so the audit log
//     entry it creates is correctly tagged.
//   - Inner <ErrorBoundary>'s fallback is now a render-prop returning
//     <AppError /> — surfacing the same shell that global-error.tsx
//     uses, but inside the React tree so locale + theme work.
//
// Why TWO layers of error boundary (Sentry.ErrorBoundary + custom):
//   - Sentry.ErrorBoundary is the LAST line — it catches even errors
//     thrown by our own <ErrorBoundary>'s render path (rare but real;
//     a fallback that itself throws).
//   - Our <ErrorBoundary level="app"> gets the audit log entry, the
//     category-aware UI, and the localised copy.
//
// References:
//   - https://docs.sentry.io/platforms/javascript/guides/react/usage/
//   - https://web.dev/articles/service-worker-lifecycle
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

// ── Phase 5 wiring imports ────────────────────────────────────
import { SentryUserContext } from '@/lib/sentry/user-context';
import { registerServiceWorker } from '@/lib/sw/register';
import { AppError } from '@/components/error';

export function AppProvider({ children }: { children: React.ReactNode }) {
  useAuthSync();
  useRouteTracker();
  useBeforeunloadSave();
  useWebVitals();
  const t = useTranslations('common.status');

  useEffect(() => {
    // ── Cross-tab auth synchronisation (v1 behaviour preserved) ──
    const cleanup = listenCrossTabAuth();

    // ── Task #52 Phase 5: Service worker registration ──
    //
    // Fire-and-forget — the register helper never throws and returns
    // null in dev. No cleanup needed (the SW lifecycle is owned by
    // the browser, not React).
    void registerServiceWorker();

    return cleanup;
  }, []);

  const isOnline = useOnlineStatus();

  return (
    <>
      {/* ── Sentry user-context bridge (renders nothing) ──
          Mounted FIRST so an error during initial render is captured
          with the correct user identity. */}
      <SentryUserContext />

      {/* ── Outer Sentry boundary — last-resort capture ── */}
      <Sentry.ErrorBoundary fallback={SentryFallback} showDialog={false}>
        {/* ── Inner Datun boundary — categorisation + audit log ── */}
        <ErrorBoundary
          level="app"
          fallback={({ error, eventId, resetBoundary }) => (
            <AppError
              error={error as Error & { digest?: string }}
              referenceId={eventId}
              reset={resetBoundary}
            />
          )}
        >
          <SkipToContent />
          <RouteProgress />
          {!isOnline && (
            <div
              role="status"
              className="fixed top-0 right-0 left-0 z-[9999] bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950 shadow-sm print:hidden"
            >
              <span aria-hidden="true">📡</span> {t('offline')}
            </div>
          )}
          {children}
          <ViewportIndicator />
        </ErrorBoundary>
      </Sentry.ErrorBoundary>
    </>
  );
}
