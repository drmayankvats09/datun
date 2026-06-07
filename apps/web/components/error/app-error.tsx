// apps/web/components/error/app-error.tsx
// ═══════════════════════════════════════════════════════════════
// APP ERROR — Global / app-level fallback (Task #52 Phase 2)
//
// The fallback rendered when the OUTERMOST boundary catches an error:
//
//   1. Used by `app/global-error.tsx` — Next.js renders this OUTSIDE
//      the root layout when the layout itself throws. CSS variables,
//      Tailwind context, fonts — none of those are guaranteed to be
//      mounted here. Hence INLINE STYLES ONLY.
//
//   2. Used by the Sentry.ErrorBoundary fallback in AppProvider — the
//      same constraint applies; the layout may still be partially
//      mounted, but we don't want to depend on it.
//
// What's intentionally MISSING here (vs RouteError / WidgetError):
//   - No next-intl (the layout, where NextIntlClientProvider mounts,
//     may have crashed)
//   - No Tailwind class names (the stylesheet might not have loaded
//     if the failure was build-time / chunk-load)
//   - No <Link> from i18n — plain <a> instead
//   - No SVG illustration — a minimal Unicode symbol is reliable
//   - No QueryProvider — the boundary lives OUTSIDE the provider tree
//
// What IS included:
//   - The Datun brand color (#00A896) — hardcoded
//   - English copy by default — accepts overrides for locales the
//     consumer has pre-resolved (Phase 5 wires this)
//   - Sentry event ID / Next digest as reference for support
//   - Direct `mailto:hello@datunai.com` link (the support email is
//     baked into THIS file rather than coming from a config; this is
//     the LAST line of defence and must work even when config breaks)
//
// References:
//   - https://nextjs.org/docs/app/api-reference/file-conventions/error
//   - https://nextjs.org/docs/app/getting-started/error-handling#handling-global-errors
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

// ─── Locale-resolved copy (defaults to English) ─────────────────

/**
 * Pre-translated strings used by AppError. Defaults to English. The
 * consumer (global-error.tsx) may resolve these from a static
 * fallback locale dictionary in Phase 5 — but the file STAYS
 * runnable with the defaults if i18n initialisation fails.
 */
export interface AppErrorCopy {
  readonly title: string;
  readonly description: string;
  readonly tryAgain: string;
  readonly goHome: string;
  readonly referenceLabel: string;
  readonly contactPrefix: string;
  readonly contactEmail: string;
}

const DEFAULT_COPY: AppErrorCopy = {
  title: 'Something went wrong',
  description: 'An unexpected error occurred. Our team has been automatically notified.',
  tryAgain: 'Try again',
  goHome: 'Go to homepage',
  referenceLabel: 'Reference ID',
  contactPrefix: 'Need help?',
  // Hardcoded — see file header rationale.
  contactEmail: 'hello@datunai.com',
};

// ─── Props ─────────────────────────────────────────────────────

export interface AppErrorProps {
  /** The error caught. May be Error or unknown (Sentry/Next variants). */
  readonly error?: Error & { digest?: string };
  /** Reference / digest / event ID — surfaced to the user. */
  readonly referenceId?: string | null;
  /** Recovery callback — Sentry's resetError or Next's reset. */
  readonly reset?: () => void;
  /**
   * Locale-resolved copy. Pass a partial object — keys not provided
   * fall back to the English defaults. The component never refuses
   * to render even if no copy is given.
   */
  readonly copy?: Partial<AppErrorCopy>;
}

// ─── Inline style fragments ────────────────────────────────────

const styles = {
  body: {
    margin: 0,
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    background: '#ffffff',
    color: '#0a0f1a',
    textAlign: 'center' as const,
  },
  container: {
    maxWidth: '440px',
    width: '100%',
  },
  icon: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    fontSize: '32px',
    lineHeight: 1,
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
    color: '#0a0f1a',
    lineHeight: 1.3,
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '8px',
    marginBottom: 0,
    lineHeight: 1.5,
  },
  reference: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '12px',
    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
    wordBreak: 'break-all' as const,
  },
  actions: {
    marginTop: '24px',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    justifyContent: 'center',
  },
  primaryButton: {
    padding: '10px 20px',
    background: '#00a896',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  secondaryLink: {
    padding: '10px 20px',
    background: 'transparent',
    color: '#0a0f1a',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
  },
  contactLine: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '20px',
  },
  contactAnchor: {
    color: '#00a896',
    textDecoration: 'none',
  },
} as const;

// ─── Component ─────────────────────────────────────────────────

/**
 * App-level error UI. Use as the body of `global-error.tsx` and as
 * the fallback for the outermost Sentry.ErrorBoundary in AppProvider.
 *
 * Renders the body INSIDE an `<html><body>` only when used at the
 * global-error level. When used inside AppProvider, the surrounding
 * <html><body> is already present — pass `wrapInHtml={false}` (the
 * default). global-error.tsx passes the html/body separately so we
 * don't duplicate them here.
 *
 * @example  inside app/global-error.tsx
 *   <html lang="en">
 *     <body>
 *       <AppError error={error} referenceId={error.digest ?? null} reset={reset} />
 *     </body>
 *   </html>
 *
 * @example  as Sentry.ErrorBoundary fallback in AppProvider
 *   <Sentry.ErrorBoundary
 *     fallback={({ error, eventId, resetError }) => (
 *       <AppError error={error} referenceId={eventId} reset={resetError} />
 *     )}
 *   />
 */
export function AppError({ error, referenceId, reset, copy }: AppErrorProps): React.ReactElement {
  // ── Report to Sentry on first render — global crashes are P0 ──
  useEffect(() => {
    if (!error) return;
    try {
      Sentry.captureException(error, {
        tags: {
          'boundary.level': 'app',
          'error.digest': error.digest ?? 'none',
        },
      });
    } catch {
      // No-op — Sentry init may have failed; nothing more we can do.
    }
  }, [error]);

  const c: AppErrorCopy = { ...DEFAULT_COPY, ...copy };

  // ── Email subject pre-fill — helps support route incoming reports ──
  const mailto = `mailto:${c.contactEmail}?subject=${encodeURIComponent(
    `Datun support — ${referenceId ?? 'no-ref'}`,
  )}`;

  return (
    <div style={styles.body} role="alert" aria-live="assertive">
      <div style={styles.container}>
        <div style={styles.icon} aria-hidden>
          ⚠️
        </div>

        <h1 style={styles.title}>{c.title}</h1>
        <p style={styles.description}>{c.description}</p>

        {referenceId ? (
          <p style={styles.reference}>
            {c.referenceLabel}: {referenceId}
          </p>
        ) : null}

        <div style={styles.actions}>
          {reset ? (
            <button type="button" onClick={reset} style={styles.primaryButton}>
              {c.tryAgain}
            </button>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- AppError is the layer-3 fallback that renders when the layout itself crashes. Next.js <Link> requires Router context which may be unavailable here. Vanilla <a> is the only reliable navigation primitive in this failure mode. Pattern: Stripe/Vercel/Linear app-level error fallbacks. */}
          <a href="/" style={styles.secondaryLink}>
            {c.goHome}
          </a>
        </div>

        <p style={styles.contactLine}>
          {c.contactPrefix}{' '}
          <a href={mailto} style={styles.contactAnchor}>
            {c.contactEmail}
          </a>
        </p>
      </div>
    </div>
  );
}
