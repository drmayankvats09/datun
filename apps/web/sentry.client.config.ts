// apps/web/sentry.client.config.ts
// ═══════════════════════════════════════════════════════════════
// SENTRY CLIENT — Browser-side error tracking (UPGRADED — Task #52 Phase 5)
//
// Task #45 additions (preserved):
//   - Initialize CSP violation reporter (backup channel to Reporting API).
//   - Enrich CSP violation Sentry events with severity tags.
//   - Filter browser-extension noise out of CSP events.
//
// Task #52 Phase 5 additions:
//   1. feedbackIntegration() — the persistent "Send feedback" widget
//      mounted in the bottom-right of every page. Lets users submit
//      bugs/feedback without leaving the page. Labels are statically
//      English (the SDK loads BEFORE next-intl is available); the
//      crash report dialog opened from boundaries gets locale-aware
//      labels via showCrashReportDialog().
//   2. Refined beforeSend — `ChunkLoadError` is no longer in the
//      "drop" list (Phase 1 categoriser handles it explicitly with
//      a reload CTA; dropping it from Sentry hid real deploy bugs).
//   3. `release` tag from env — required for source-map matching in
//      production.
//   4. PII scrubbing via beforeBreadcrumb — strips emails/phones/OTPs
//      from breadcrumb data even when they slip past the
//      lib/sentry/breadcrumbs.ts wrapper.
//
// Reading order for new engineers:
//   1. `Sentry.init` options — sample rates, integrations
//   2. `feedbackIntegration` — Phase 5's user-feedback widget
//   3. `beforeSend` — drops noise, enriches CSP events
//   4. `beforeBreadcrumb` — strips PII from breadcrumb data
//   5. CSP violation reporter — Task #45 backup channel
//
// References:
//   - https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/
//   - https://docs.sentry.io/platforms/javascript/user-feedback/
//   - DPDP Act 2023, Section 8(3) — data minimisation
// ═══════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/nextjs';
import { initViolationReporter } from '@/lib/csp/violation-reporter';
import { enrichCspEvent } from '@/lib/csp/sentry-integration';
import { createFeedbackIntegration } from '@/lib/sentry/feedback';
import { scrubPii } from '@/lib/sentry/breadcrumbs';

if (process.env.NODE_ENV !== 'production') {
  Sentry.init({ dsn: '', enabled: false });
} else {
  Sentry.init({
    dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'] || '',
    environment: process.env['NODE_ENV'] ?? 'production',
    // Release tag — matches the Git SHA injected at build time. The
    // SENTRY_RELEASE env var is set by the @sentry/nextjs webpack
    // plugin from withSentryConfig (next.config.ts). When unset (e.g.,
    // dev preview deploys without source-map upload), Sentry falls
    // back to its default release inference.
    release: process.env['SENTRY_RELEASE'] || undefined,

    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,

    // ── Strict PII discipline — see lib/sentry/user-context.ts ──
    // sendDefaultPii: false is the default but we set it explicitly
    // so any change is reviewable in code.
    sendDefaultPii: false,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      // ── Task #52 Phase 5: Persistent user-feedback widget ──
      //
      // Labels are English here because the SDK initialises BEFORE
      // next-intl can resolve a locale. The crash-report dialog
      // opened from error boundaries DOES get locale-aware labels
      // via showCrashReportDialog() (which fetches translations at
      // call time).
      createFeedbackIntegration({
        buttonLabel: 'Send feedback',
        formTitle: 'Tell us what happened',
        messagePlaceholder: 'What can we improve?',
        submitButtonLabel: 'Send',
        cancelButtonLabel: 'Cancel',
        successMessageText: 'Thanks for your feedback.',
      }),
    ],

    beforeSend(event, hint) {
      // ── Noise filter — narrowed in Phase 5 ──
      //
      // Phase 5 change: `ChunkLoadError` removed from the drop list.
      // Phase 1's categoriser maps it → 'chunk-load' with a reload
      // CTA. Dropping it from Sentry hid real deploy-mismatch bugs
      // (we couldn't see when users were stuck on stale bundles).
      const msg = (hint?.originalException as Error)?.message ?? event.message ?? '';
      if (typeof msg === 'string') {
        if (msg.includes('ResizeObserver loop') || msg.includes('Non-Error promise rejection')) {
          return null;
        }
      }

      // ── CSP enrichment (Task #45) ──
      // Returns null for extension-noise CSP events; tags real ones.
      const enriched = enrichCspEvent(event, hint);
      if (enriched === null) return null;

      return enriched;
    },

    // ── Task #52 Phase 5: PII scrubbing in breadcrumbs ──
    //
    // Defence-in-depth — `lib/sentry/breadcrumbs.ts` already scrubs
    // values that go through the typed `addBreadcrumb()` wrapper.
    // This hook catches breadcrumbs added by auto-instrumented
    // integrations (the Sentry SDK's default fetch/console/etc.
    // capture) which the wrapper can't intercept.
    beforeBreadcrumb(breadcrumb) {
      if (!breadcrumb) return breadcrumb;
      // Scrub the message
      if (typeof breadcrumb.message === 'string') {
        breadcrumb.message = scrubPii(breadcrumb.message);
      }
      // Scrub string values in data
      if (breadcrumb.data && typeof breadcrumb.data === 'object') {
        const cleaned: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(breadcrumb.data)) {
          cleaned[key] = typeof value === 'string' ? scrubPii(value) : value;
        }
        breadcrumb.data = cleaned;
      }
      return breadcrumb;
    },

    enabled: process.env['NODE_ENV'] === 'production',
  });

  // ── CSP violation reporter (backup channel) ──
  // Idempotent — safe across HMR / fast-refresh re-renders.
  initViolationReporter();
}
