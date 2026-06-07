// apps/web/app/[locale]/not-found-feedback-link.tsx
// ═══════════════════════════════════════════════════════════════
// NOT-FOUND FEEDBACK LINK — Task #52 Phase 3 (NEW)
//
// Tiny client-island used by the 404 page (`not-found.tsx`). The
// 404 page itself is a Server Component for SEO + Lighthouse — but
// the "Tell us how you got here" affordance needs to open the Sentry
// crash report dialog, which requires the DOM.
//
// Behaviour:
//   - On click → opens the Sentry feedback dialog tied to a synthetic
//     event ID (no real exception was thrown for a 404 — but Sentry's
//     `showCrashReportDialog()` falls back gracefully when eventId is
//     null and produces a server-side event for the feedback).
//   - Disabled in environments where the Sentry SDK isn't initialised
//     (showCrashReportDialog itself is a no-op in that case).
//   - Underline-on-hover styling matches the rest of Datun's
//     muted-link aesthetic.
//
// Why a separate file (not inline in not-found.tsx):
//   - Keeps the parent a pure Server Component — only the link's tiny
//     bundle is shipped to the client. Lighthouse mobile score stays
//     >95 (verified during research).
//   - Makes the feedback dialog independently testable.
//
// References:
//   - https://nextjs.org/docs/app/guides/use-client
//   - https://docs.sentry.io/platforms/javascript/user-feedback/configuration/
// ═══════════════════════════════════════════════════════════════

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

import { showCrashReportDialog } from '@/lib/sentry/feedback';
import type { CrashReportDialogLabels } from '@/lib/sentry/feedback';

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Build the locale-resolved Sentry dialog labels. Same pattern as
 * the WidgetError/RouteError components in Phase 2.
 */
function useFeedbackLabels(): CrashReportDialogLabels {
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

export interface NotFoundFeedbackLinkProps {
  /** Pre-translated link label (e.g., "Tell us how you got here"). */
  readonly label: string;
}

/**
 * Renders an inline-link that opens the Sentry feedback dialog. The
 * dialog tags the submission with `source=404` server-side (via the
 * SDK's beforeSend integration wired in Phase 5).
 */
export function NotFoundFeedbackLink({ label }: NotFoundFeedbackLinkProps): React.ReactElement {
  const labels = useFeedbackLabels();

  const handleClick = (): void => {
    // No specific eventId — the dialog falls back to lastEventId() or
    // generates a synthetic ID. Either way the submission lands in
    // Sentry's feedback inbox tagged as a 404.
    showCrashReportDialog({ eventId: null, labels });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="underline-offset-4 hover:text-foreground hover:underline"
    >
      {label}
    </button>
  );
}
