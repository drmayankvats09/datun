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
// Task #53.5 W2 additions (CUT-4 — client bundle diet):
//   1. Session Replay is NO LONGER in the init integrations array —
//      it lazy-registers at browser idle via scheduleLazyReplay()
//      (the rrweb recorder moves to its own async chunk; the
//      replays*SampleRate options stay in init and apply the moment
//      the integration registers — Sentry's documented pattern).
//   2. The feedback widget switched to the ASYNC variant inside
//      lib/sentry/feedback.ts — launcher button sync (tiny), form
//      modal + screenshot tooling load on first click.
//   3. SDK dead-weight build flags (bundleSizeOptimizations) live
//      in next.config.ts.
//
// Reading order for new engineers:
//   1. `Sentry.init` options — sample rates, integrations
//   2. createFeedbackIntegration — Phase 5's widget (async since W2)
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
    // Replay sample rates stay HERE even though the integration is
    // lazy-registered below — the SDK stores them and applies them
    // at registration time (documented "lazy-load Replay" pattern).
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,

    // ── Strict PII discipline — see lib/sentry/user-context.ts ──
    // sendDefaultPii: false is the default but we set it explicitly
    // so any change is reviewable in code.
    sendDefaultPii: false,

    integrations: [
      // Replay is intentionally ABSENT here — lazy-registered after
      // init via scheduleLazyReplay() below (Task #53.5 W2, CUT-4).
      //
      // ── Task #52 Phase 5: Persistent user-feedback widget ──
      // (Task #53.5 W2: now the ASYNC variant under the hood — the
      // launcher ships sync, the form chunk loads on first click.
      // See lib/sentry/feedback.ts.)
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

  // ── Task #53.5 W2 (CUT-4): lazy-register Session Replay ──
  //
  // replayIntegration was the heaviest piece of the Sentry client
  // bundle (the rrweb recorder), statically shipped to 100% of
  // visitors to record 5% of sessions. Sentry's documented
  // "lazy-load Replay" pattern moves it behind a dynamic import:
  // the static module graph no longer references it, so the bundler
  // emits the recorder as its own async chunk, fetched at browser
  // idle.
  //
  // Trade-off (accepted, documented): an error thrown in the first
  // ~0–3s — before the integration registers — carries no replay.
  // Pre-launch, with a 5% session sample, the shared-chunk win for
  // 100% of visitors outweighs replay coverage of the first seconds.
  // Revisit when real traffic data argues otherwise.
  scheduleLazyReplay();
}

/**
 * Register Session Replay AFTER first paint, off the critical path.
 *
 * requestIdleCallback ⇒ zero contention with hydration; the
 * setTimeout fallback covers Safari (still no rIC support). The
 * 5s rIC timeout guarantees registration even on perpetually-busy
 * main threads, so error-replay sampling stays predictable.
 */
function scheduleLazyReplay(): void {
  if (typeof window === 'undefined') return;

  const register = (): void => {
    import('@sentry/nextjs')
      .then((lazy) => {
        Sentry.addIntegration(
          lazy.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
          }),
        );
      })
      .catch(() => {
        // Replay is best-effort observability — a failed chunk load
        // (offline, ad-blocker, CSP hiccup) must never surface to
        // the user, nor recurse into error tracking itself.
      });
  };

  type IdleCapableWindow = Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  const w = window as IdleCapableWindow;

  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(register, { timeout: 5000 });
  } else {
    window.setTimeout(register, 3000);
  }
}
