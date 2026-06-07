// apps/web/components/error/route-error.tsx
// ═══════════════════════════════════════════════════════════════
// ROUTE ERROR — Full-page error UI (Task #52 Phase 2)
//
// The component every Next.js route-segment error.tsx renders. Takes
// the standard `error.tsx` props shape:
//
//   ({ error, reset }) → <RouteError error={error} reset={reset} />
//
// Used by:
//   - app/[locale]/error.tsx (root error)
//   - app/[locale]/(auth)/error.tsx
//   - app/[locale]/(legal)/error.tsx
//   - app/[locale]/consult/error.tsx
//   - app/[locale]/consult/[id]/error.tsx
//   - app/[locale]/admin/error.tsx
//   - app/[locale]/admin/security/error.tsx
//
// Behaviour vs WidgetError:
//   - Renders at `size="page"` — takes ~50vh, vertically centred
//   - Categorises the error and picks the matching illustration
//   - Includes Sentry event ID as a copy-able reference
//   - Provides "Try again", "Go home", and "Report bug" actions
//   - Calls Sentry.captureException on mount (Next.js error.tsx props
//     do NOT auto-report — this is the layer that does)
//
// Note on Next.js 16 — error.tsx pages receive `reset` which calls
// `router.refresh() + retry render`. We pass that as `resetBoundary`
// to RetryButton so the framework handles the actual recovery.
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { LogIn, RotateCcw } from 'lucide-react';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useErrorCategory } from '@/hooks/use-error-category';
import { showCrashReportDialog } from '@/lib/sentry/feedback';
import { logErrorToAudit, getAuditSessionId } from '@/lib/errors';

import { ErrorCard } from './error-card';
import { RetryButton } from './retry-button';
import { getIllustrationFor } from './error-illustrations';

// ─── Props ─────────────────────────────────────────────────────

export interface RouteErrorProps {
  /**
   * The error from Next.js error.tsx. The `digest` field is set by
   * Next.js for server-rendered errors and surfaces in our incident-ID
   * footer.
   */
  readonly error: Error & { digest?: string };
  /**
   * Next.js's reset function. Calls router.refresh() + re-renders the
   * boundary's children. Pass directly to RetryButton's resetBoundary.
   */
  readonly reset: () => void;
  /**
   * Optional route-segment identifier — added as a Sentry tag for
   * triage ("show me all errors from the consultation route").
   */
  readonly segment?: string;
}

// ─── Helpers ───────────────────────────────────────────────────

function useFeedbackLabels(): import('@/lib/sentry/feedback').CrashReportDialogLabels {
  const t = useTranslations('errors.feedback');
  return {
    title: t('title'),
    subtitle: t('subtitle'),
    subtitle2: t('subtitle2'),
    labelName: t('labelName'),
    labelEmail: t('labelEmail'),
    labelComments: t('labelComments'),
    labelClose: t('labelClose'),
    labelSubmit: t('labelSubmit'),
    errorGeneric: t('errorGeneric'),
    errorFormEntry: t('errorFormEntry'),
    successMessage: t('successMessage'),
  };
}

// ─── Component ─────────────────────────────────────────────────

export function RouteError({ error, reset, segment }: RouteErrorProps): React.ReactElement {
  const { category, isRetryable, strategy } = useErrorCategory(error);

  const t = useTranslations('errors');
  const tCategory = useTranslations('errors.category');
  const tActions = useTranslations('errors.actions');
  const feedbackLabels = useFeedbackLabels();

  // ── Report to Sentry + audit on first render ──
  //
  // Why useEffect (not module-scope): Next.js error.tsx can re-render
  // with the same error reference during a failed retry. We dedupe by
  // capturing only when `error` reference changes.
  useEffect(() => {
    try {
      Sentry.captureException(error, {
        tags: {
          'error.category': category,
          'error.severity': strategy.action === 'reload' ? 'fatal' : 'error',
          'boundary.level': 'route',
          'route.segment': segment ?? 'unknown',
          'error.digest': error.digest ?? 'none',
        },
      });
    } catch {
      // Sentry init can fail in dev; swallow.
    }

    try {
      logErrorToAudit({
        sessionId: getAuditSessionId(),
        sentryEventId: Sentry.lastEventId() ?? null,
        category,
        severity: strategy.action === 'reload' ? 'fatal' : 'error',
        recoveryAction: strategy.action,
        retryCount: 0,
        statusCode: null,
        code: null,
        errorName: error.name,
        diagnosticMessage: (error.message || error.name).slice(0, 140),
        boundaryLevel: 'route',
        pathname: typeof window !== 'undefined' ? window.location.pathname : 'ssr',
        clientTimestamp: new Date().toISOString(),
        locale: typeof navigator !== 'undefined' ? navigator.language : 'en',
      });
    } catch {
      // Audit helpers never throw; defensive wrapper.
    }
    // Re-running on `error` reference change is intentional — `category`
    // / `strategy` are derived from `error` and won't change without it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const Illustration = getIllustrationFor(category);

  // ── Primary CTA per strategy ──
  let primaryAction: React.ReactNode;

  switch (strategy.action) {
    case 'retry':
    case 'wait-and-retry':
      primaryAction = <RetryButton onRetry={reset} resetBoundary={reset} />;
      break;

    case 'reauthenticate':
      primaryAction = (
        <Button asChild>
          <Link href={{ pathname: '/login' }}>
            <LogIn aria-hidden />
            <span>{tActions('signInAgain')}</span>
          </Link>
        </Button>
      );
      break;

    case 'reload':
      primaryAction = (
        <Button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
        >
          <RotateCcw aria-hidden />
          <span>{tActions('reload')}</span>
        </Button>
      );
      break;

    case 'navigate-home':
      primaryAction = (
        <Button asChild>
          <Link href="/">
            <span>{tActions('goHome')}</span>
          </Link>
        </Button>
      );
      break;

    case 'contact-support':
      primaryAction = (
        <Button
          onClick={() => {
            showCrashReportDialog({
              eventId: Sentry.lastEventId() ?? null,
              labels: feedbackLabels,
            });
          }}
        >
          <span>{tActions('getHelp')}</span>
        </Button>
      );
      break;

    default: {
      const _exhaustive: never = strategy.action;
      void _exhaustive;
      primaryAction = null;
    }
  }

  // ── Secondary CTA — Go home as a non-blocking escape hatch ──
  const secondaryAction =
    strategy.offerHomeAsFallback && strategy.action !== 'navigate-home' ? (
      <Button asChild variant="outline">
        <Link href="/">{tActions('goHome')}</Link>
      </Button>
    ) : null;

  // ── Footer — incident reference + report-bug link ──
  const referenceId = error.digest ?? Sentry.lastEventId() ?? null;
  const footer = (
    <>
      {referenceId ? (
        <p className="mb-1">
          {t('referenceLabel')}:{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.7rem]">
            {referenceId}
          </code>
        </p>
      ) : null}
      {isRetryable ? null : (
        <button
          type="button"
          className="text-primary underline-offset-4 hover:underline"
          onClick={() => {
            showCrashReportDialog({
              eventId: Sentry.lastEventId() ?? null,
              labels: feedbackLabels,
            });
          }}
        >
          {tActions('reportBug')}
        </button>
      )}
    </>
  );

  return (
    <main className="bg-background">
      <ErrorCard
        size="page"
        role="alert"
        illustration={<Illustration />}
        title={tCategory(`${category}.title`)}
        description={tCategory(`${category}.message`)}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
        footer={footer}
      />
    </main>
  );
}
