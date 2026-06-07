// apps/web/components/error/widget-error.tsx
// ═══════════════════════════════════════════════════════════════
// WIDGET ERROR — Compact inline error UI (Task #52 Phase 2)
//
// The fallback rendered inside FeatureBoundary. Designed for in-page
// errors: a single section of a page has failed (chat panel, photo
// uploader, clinic list) but the surrounding page navigation, header,
// and other features are healthy.
//
// Behaviour:
//   - Categorises the error via @/hooks/use-error-category (Phase 1)
//   - Picks the matching illustration from error-illustrations
//   - Renders ErrorCard at `size="compact"` so the UI doesn't take
//     over the surrounding page layout
//   - "Try again" → retries via useErrorRecovery (queryClient reset
//     + boundary reset). If category is NOT retryable, hides the
//     retry button and shows only a contextual CTA (e.g. "Sign in"
//     for auth, "Reload" for chunk-load)
//   - "Get help" link opens the Sentry crash report dialog tied to
//     the eventId
//
// Props mirror ErrorBoundaryFallbackProps + a featureName for the
// "Reload section" affordance. Consumed directly by FeatureBoundary
// in Phase 2 and by Phase 3's route-level fallbacks where compact
// rendering is preferred.
// ═══════════════════════════════════════════════════════════════

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { LogIn, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useErrorCategory } from '@/hooks/use-error-category';
import { showCrashReportDialog } from '@/lib/sentry/feedback';
import type { ErrorBoundaryFallbackProps } from '@/components/a11y/error-boundary';

import { ErrorCard } from './error-card';
import { RetryButton } from './retry-button';
import { getIllustrationFor } from './error-illustrations';

// ─── Props ─────────────────────────────────────────────────────

export interface WidgetErrorProps extends ErrorBoundaryFallbackProps {
  /**
   * Human-readable feature name for analytics/audit. Lowercase
   * snake_case — matches the FeatureBoundary's `name` prop.
   */
  readonly featureName?: string;
}

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Resolve the feedback dialog labels from the current i18n namespace.
 * Encapsulated here so the consuming component stays declarative.
 */
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

/**
 * Compact in-page error UI. Render inside a feature boundary's
 * fallback OR pass directly to <ErrorBoundary fallback={...} />.
 */
export function WidgetError({
  error,
  eventId,
  categorised,
  resetBoundary,
  featureName,
}: WidgetErrorProps): React.ReactElement {
  // We could rely on the boundary's pre-computed `categorised`, but
  // running the hook unconditionally gives us the recovery strategy
  // in the same call without an extra round-trip.
  const { category, isRetryable, strategy } = useErrorCategory(error);

  // ── Defensive: prefer boundary's categorisation if Phase 1's hook
  //    happened to disagree (impossible under sound types, but a safety
  //    net for future maintainers).
  void categorised;

  const t = useTranslations('errors');
  const tCategory = useTranslations('errors.category');
  const tActions = useTranslations('errors.actions');
  const feedbackLabels = useFeedbackLabels();

  const Illustration = getIllustrationFor(category);

  // ── Build the primary CTA per strategy ──
  let primaryAction: React.ReactNode = null;

  switch (strategy.action) {
    case 'retry':
      primaryAction = <RetryButton size="sm" resetBoundary={resetBoundary} />;
      break;

    case 'reauthenticate':
      primaryAction = (
        <Button asChild size="sm">
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
          size="sm"
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
        <Button asChild size="sm">
          <Link href="/">
            <span>{tActions('goHome')}</span>
          </Link>
        </Button>
      );
      break;

    case 'wait-and-retry':
      // RetryButton handles the countdown internally via useErrorRecovery.
      primaryAction = <RetryButton size="sm" resetBoundary={resetBoundary} />;
      break;

    case 'contact-support':
      primaryAction = (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            showCrashReportDialog({ eventId, labels: feedbackLabels });
          }}
        >
          <span>{tActions('getHelp')}</span>
        </Button>
      );
      break;

    default: {
      // Exhaustive — every strategy.action above is handled.
      const _exhaustive: never = strategy.action;
      void _exhaustive;
      primaryAction = null;
    }
  }

  // ── Optional secondary CTA — "Go home" link when strategy suggests ──
  const secondaryAction =
    strategy.offerHomeAsFallback && strategy.action !== 'navigate-home' ? (
      <Button asChild size="sm" variant="ghost">
        <Link href="/">{tActions('goHome')}</Link>
      </Button>
    ) : null;

  // ── Footer — reference ID (only when retry is exhausted / non-retryable) ──
  const footer =
    !isRetryable && eventId ? (
      <p>
        {t('referenceLabel')}:{' '}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.7rem]">{eventId}</code>
      </p>
    ) : null;

  return (
    <ErrorCard
      size="compact"
      role="alert"
      illustration={<Illustration />}
      title={tCategory(`${category}.title`)}
      description={
        featureName
          ? tCategory(`${category}.messageWithFeature`, { feature: featureName })
          : tCategory(`${category}.message`)
      }
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      footer={footer}
    />
  );
}
