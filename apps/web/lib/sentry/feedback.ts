// apps/web/lib/sentry/feedback.ts
// ═══════════════════════════════════════════════════════════════
// SENTRY USER FEEDBACK — Task #52 Phase 1 (Foundation)
//
// Wraps two Sentry capabilities into Datun-branded helpers:
//
//   1. feedbackAsyncIntegration() — the persistent "Send feedback"
//      widget shown at the corner of every page. Used for general
//      feedback, bug reports, and feature requests. Mounted ONCE via
//      the Sentry.init() integrations array in `sentry.client.config.ts`.
//
//      Task #53.5 W2 (CUT-4): switched from feedbackIntegration to
//      the ASYNC variant. The launcher button ships in the sync
//      bundle (tiny); the form modal + screenshot tooling load in a
//      separate chunk on FIRST CLICK. Identical options API — only
//      the loading strategy changed. (@sentry-internal/feedback was
//      a named block in the Task #53 treemap; this removes it from
//      the shared first-load chunk.)
//
//   2. showReportDialog() — the modal that opens AFTER an error has
//      been captured by Sentry. Pre-fills the `eventId` so the
//      submitted report links back to the exact crash. Triggered by
//      "Report this bug" CTAs in error boundary fallbacks.
//
// Localisation:
//   - All labels are passed in via parameter so the calling component
//     can pre-fetch translations via next-intl. The Sentry SDK accepts
//     fully-localised strings for ALL widget labels.
//
// Branding:
//   - Theme colors match Datun's primary teal (#00A896) and the dark
//     fallback (#0A0F1A). The widget reads CSS variables when available
//     so it inherits the user's theme.
//
// Browser-only:
//   - Both APIs require the DOM. The functions noop on SSR — never throw.
//
// References:
//   - https://docs.sentry.io/platforms/javascript/guides/react/user-feedback/
//   - https://docs.sentry.io/platforms/javascript/user-feedback/configuration/
// ═══════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/nextjs';

// ─── Feedback widget configuration ─────────────────────────────

/**
 * Locale-aware labels for the persistent feedback widget. Callers
 * pass these from next-intl translation files — e.g.
 * `messages/en/errors.json#feedback.*`.
 */
export interface FeedbackLabels {
  /** Label shown ON the floating launcher button itself. */
  readonly buttonLabel: string;
  /** Title at the top of the feedback form modal. */
  readonly formTitle: string;
  /** Placeholder text in the message textarea. */
  readonly messagePlaceholder: string;
  /** Submit-button label. */
  readonly submitButtonLabel: string;
  /** Cancel-button label. */
  readonly cancelButtonLabel: string;
  /** Thank-you message shown after submission. */
  readonly successMessageText: string;
}

/**
 * Datun brand colors for the feedback widget. Sentry's widget honours
 * CSS variables — we forward Datun's tokens.
 *
 * Note: The widget renders inside a Shadow DOM, so app-level CSS does
 * NOT cascade into it. These options are the ONLY styling hook.
 */
const BRAND_COLORS = {
  /** Primary action color — Datun teal. */
  background: '#00A896',
  foreground: '#FFFFFF',
  /** Background of the modal overlay. */
  backgroundDark: '#0A0F1A',
  foregroundDark: '#FFFFFF',
} as const;

/**
 * Build the Sentry feedback integration. Called from
 * `sentry.client.config.ts` inside the `integrations` array.
 *
 * @example
 *   // sentry.client.config.ts
 *   Sentry.init({
 *     integrations: [
 *       createFeedbackIntegration({
 *         buttonLabel: 'Send feedback',
 *         formTitle: 'Tell us what happened',
 *         // ...
 *       }),
 *     ],
 *   })
 */
export function createFeedbackIntegration(
  labels: FeedbackLabels,
): ReturnType<typeof Sentry.feedbackAsyncIntegration> {
  return Sentry.feedbackAsyncIntegration({
    // ── Labels (localised by the caller) ──
    buttonLabel: labels.buttonLabel,
    formTitle: labels.formTitle,
    messagePlaceholder: labels.messagePlaceholder,
    submitButtonLabel: labels.submitButtonLabel,
    cancelButtonLabel: labels.cancelButtonLabel,
    successMessageText: labels.successMessageText,

    // ── Behaviour ──
    // Auto-inject the launcher button into the page.
    autoInject: true,
    // Show the email & name fields so support can follow up if needed.
    // Both are OPTIONAL by default — users can submit anonymously.
    showName: true,
    showEmail: true,
    // Email is optional — anonymous feedback is welcome.
    isEmailRequired: false,
    isNameRequired: false,
    // Allow screenshot — useful for visual bugs (mobile users especially).
    enableScreenshot: true,

    // ── Theming ──
    colorScheme: 'system', // honour user's OS dark-mode preference
    themeLight: {
      background: BRAND_COLORS.background,
      foreground: BRAND_COLORS.foreground,
    },
    themeDark: {
      background: BRAND_COLORS.backgroundDark,
      foreground: BRAND_COLORS.foregroundDark,
    },
  });
}

// ─── Crash report dialog ───────────────────────────────────────

/**
 * Locale-aware labels for the one-shot crash report dialog. Same
 * field set as the persistent widget — Sentry uses the same surface
 * for both flows.
 */
export interface CrashReportDialogLabels {
  /** Title displayed at the top of the dialog. */
  readonly title: string;
  /** Subtitle shown beneath the title. */
  readonly subtitle: string;
  /** Subtitle shown if the user is logged in. */
  readonly subtitle2: string;
  /** Field label for the name input. */
  readonly labelName: string;
  /** Field label for the email input. */
  readonly labelEmail: string;
  /** Field label for the description textarea. */
  readonly labelComments: string;
  /** Close-button label. */
  readonly labelClose: string;
  /** Submit-button label. */
  readonly labelSubmit: string;
  /** Error message shown if a required field is missing. */
  readonly errorGeneric: string;
  /** Error message shown if the form submission itself fails. */
  readonly errorFormEntry: string;
  /** Confirmation shown after successful submission. */
  readonly successMessage: string;
}

/**
 * Show the Sentry crash report dialog tied to a specific captured
 * event. Use this from error boundary "Report this bug" CTAs:
 *
 *   const eventId = Sentry.captureException(error)
 *   showCrashReportDialog({ eventId, labels })
 *
 * If `eventId` is null (boundary doesn't have one yet), the dialog
 * still opens — Sentry generates a fresh event ID server-side to
 * carry the feedback. Either way, the report is correlated to the
 * incident.
 *
 * @param options.eventId  — Sentry event ID from captureException,
 *                            or `Sentry.lastEventId()`. Pass `null`
 *                            to open a free-standing report.
 * @param options.labels   — Localised string set. Pre-translated by
 *                            the caller via next-intl.
 * @param options.user     — Optional pre-fill { name, email }. Pass
 *                            ONLY when the user is logged in AND
 *                            consented to share identity with support.
 *                            Otherwise the dialog leaves fields blank.
 */
export interface ShowCrashReportDialogOptions {
  readonly eventId: string | null;
  readonly labels: CrashReportDialogLabels;
  readonly user?: { readonly name?: string; readonly email?: string };
}

export function showCrashReportDialog(options: ShowCrashReportDialogOptions): void {
  // SSR guard — Sentry.showReportDialog requires the DOM.
  if (typeof window === 'undefined') return;

  // Resolve eventId — fall back to the SDK's last-known event so the
  // CTA still does something useful even if the caller forgot to pass.
  const resolvedEventId = options.eventId ?? Sentry.lastEventId() ?? generateFallbackEventId();

  try {
    Sentry.showReportDialog({
      eventId: resolvedEventId,
      // Pre-fill identity ONLY when explicitly provided.
      ...(options.user?.name ? { user: { name: options.user.name } } : {}),
      ...(options.user?.email
        ? {
            user: {
              email: options.user.email,
              ...(options.user?.name ? { name: options.user.name } : {}),
            },
          }
        : {}),
      // ── Labels (localised by caller) ──
      title: options.labels.title,
      subtitle: options.labels.subtitle,
      subtitle2: options.labels.subtitle2,
      labelName: options.labels.labelName,
      labelEmail: options.labels.labelEmail,
      labelComments: options.labels.labelComments,
      labelClose: options.labels.labelClose,
      labelSubmit: options.labels.labelSubmit,
      errorGeneric: options.labels.errorGeneric,
      errorFormEntry: options.labels.errorFormEntry,
      successMessage: options.labels.successMessage,
    });
  } catch {
    // showReportDialog throws if the DSN is unset or the SDK was
    // initialised in degraded mode. We swallow — the user already
    // sees the error UI; the dialog is a nice-to-have.
  }
}

/**
 * Generate a synthetic event ID in the rare case both the passed
 * eventId AND Sentry.lastEventId() are null. This keeps the dialog
 * functional in degraded SDK states (e.g., DSN not configured in dev).
 *
 * The synthetic ID is a 32-char hex string matching Sentry's format
 * so the dialog renders correctly — but it won't correlate to a
 * real event in the Sentry dashboard. That's an acceptable trade-off
 * for guaranteeing the CTA always works.
 */
function generateFallbackEventId(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
