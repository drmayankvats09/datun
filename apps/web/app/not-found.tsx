// apps/web/app/not-found.tsx
// ═══════════════════════════════════════════════════════════════
// ROOT 404 PAGE — Task #52 Hotfix (CSP nonce alignment)
//
// PROBLEM (production bug post-merge):
//   The previous implementation (`redirect('/en')`) was classified by
//   Next.js's build pipeline as STATIC (`○ /_not-found`). The static
//   prerender embedded framework `<script>` bootstrap markup whose
//   nonce was computed at BUILD time. But proxy.ts emits a FRESH
//   per-request nonce in the CSP header on every response. The two
//   never match → strict-dynamic blocks every chunk → WHITE SCREEN.
//
// WHY THIS PAGE GETS HIT AT ALL:
//   next-intl `localePrefix: 'as-needed'` rewrites `/en/foo` to `/foo`
//   internally. Paths that don't match any defined route fall out of
//   the `[locale]` segment and into the ROOT `not-found.tsx`. Every
//   404 on the site lands here.
//
// FIX:
//   1. `export const dynamic = 'force-dynamic'` — opt out of static
//      prerender. Every request renders fresh, so Next.js applies the
//      per-request nonce to its script tags. CSP enforcement now works.
//   2. Render a self-contained 404 page (inline styles, zero provider
//      tree) so this file works even when the broader locale context
//      is unavailable — root not-found.tsx lives ABOVE the [locale]
//      segment, so it has no NextIntlClientProvider, ThemeProvider,
//      QueryProvider, etc. Same defensive pattern as global-error.tsx.
//   3. Brand color literals (#00A896 teal, #0A0F1A dark) embedded —
//      no Tailwind dependency, no shadcn/ui, no font loading.
//
// Pattern: Stripe / Vercel / GitHub root 404 design — pure HTML/CSS,
//          zero JS dependency, works under any CSP / network condition.
// ═══════════════════════════════════════════════════════════════

import Link from 'next/link';

/**
 * Force dynamic rendering — opts out of static prerender so Next.js
 * applies the per-request CSP nonce (set by proxy.ts) to all framework
 * bootstrap <script> tags. Static prerender at build time embeds a
 * stale nonce → strict-dynamic blocks every chunk → blank page.
 */
export const dynamic = 'force-dynamic';

export default function RootNotFound(): React.ReactElement {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0F1A',
          color: '#ffffff',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        <main
          style={{
            maxWidth: '480px',
            padding: '2rem 1.5rem',
            textAlign: 'center',
          }}
        >
          {/* ── Status pill ── */}
          <div
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(0, 168, 150, 0.15)',
              color: '#00A896',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '1.5rem',
            }}
          >
            404
          </div>

          {/* ── Headline ── */}
          <h1
            style={{
              fontSize: '1.875rem',
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: '0.75rem',
              marginTop: 0,
              color: '#ffffff',
            }}
          >
            Page not found
          </h1>

          {/* ── Description ── */}
          <p
            style={{
              fontSize: '0.95rem',
              lineHeight: 1.6,
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '2rem',
              marginTop: 0,
            }}
          >
            The page you are looking for does not exist or has been moved.
          </p>

          {/* ── Primary CTA — return home (with locale prefix) ── */}
          <Link
            href="/en"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              backgroundColor: '#00A896',
              color: '#0A0F1A',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Return home
          </Link>

          {/* ── Support email (matches global-error.tsx tone) ── */}
          <p
            style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.4)',
              marginTop: '2.5rem',
              marginBottom: 0,
            }}
          >
            Need help?{' '}
            <a
              href="mailto:hello@datunai.com"
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                textDecoration: 'underline',
              }}
            >
              hello@datunai.com
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
