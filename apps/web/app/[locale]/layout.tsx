// apps/web/app/[locale]/layout.tsx
// ═══════════════════════════════════════════════════════════════
// LOCALE LAYOUT — Main layout with i18n + all providers + CSP nonce
//
// CSP nonce flow (Task #45 — nonce-only architecture):
//   1. proxy.ts generates a per-request nonce for EVERY HTML route.
//   2. Next.js applies that nonce to every framework <script> it renders.
//   3. This layout also reads the nonce via getNonce() and forwards it to:
//        - ThemeProvider (next-themes v0.4.6+ supports `nonce` prop).
//        - LocaleFont (uses nonce when injecting dynamic <link> stylesheet).
//
// If getNonce() returns '' (e.g. in unit tests with no proxy in front),
// ThemeProvider receives `undefined` — harmless, since Next.js still
// nonces the rendered <script> from the CSP header.
//
// PHASE 3 (Task #47) UPDATE:
//   Mounted <QueryProvider> between NextIntlClientProvider and
//   ThemeProvider. Order chosen so that:
//     - ThemeProvider stays outermost on <html> (next-themes adds the
//       class attribute there).
//     - QueryProvider sits ABOVE everything that consumes server-state
//       hooks — AppProvider (route tracker etc.) and child pages.
//     - Toaster sits BELOW QueryProvider so the QueryCache's global
//       error handler can fire toasts via sonner.
//
//   No other markup changed. Zero impact on existing styling/behaviour.
//
// TASK #49 UPDATE — added <PostHogProvider> inside QueryProvider:
//   Placement constraints:
//     - INSIDE QueryProvider — the provider's auth-identify effect
//       reads from `useAuthStore()`, which is fine without a Query
//       wrapper, but Phase D will switch identify to a TanStack
//       hook and that requires the QueryProvider to be above.
//     - OUTSIDE ThemeProvider — irrelevant to ordering, but keeping
//       it ABOVE ThemeProvider lets every flag-gated UI mount with
//       analytics already initialised.
//   When NEXT_PUBLIC_POSTHOG_KEY is unset the provider runs in
//   degraded mode (no SDK load, no events, no overhead).
//
// TASK #50 UPDATE — added <MotionConfigProvider>:
//   Placement: INSIDE PostHogProvider, OUTSIDE ThemeProvider.
//
//   Why inside PostHog: MotionConfigProvider emits a telemetry event
//   (`motion_level_active`) every time the resolved motion level
//   changes — capturePostHogEvent() requires the PostHog SDK to be
//   initialised, which the parent PostHogProvider does on mount.
//
//   Why outside ThemeProvider: motion governance is independent of
//   theme; keeping it higher in the tree means every theme-aware
//   component (ThemeProvider's descendants) gets motion config for
//   free without re-wiring.
//
//   The provider does THREE jobs:
//     1. <MotionConfig reducedMotion="user"> — Framer Motion honours
//        the user's OS prefers-reduced-motion automatically.
//     2. <LazyMotion features={domAnimation}> — bundle reduction
//        foundation. Bundle savings accrue as components migrate
//        to `m.*` (`strict` mode flip happens after that).
//     3. <MotionLevelContext.Provider> — composite "effective motion
//        level" (full / reduced / none) combining OS pref + network
//        + future low-power signal. Consumed via useMotionLevel().
//
// TASK #53 UPDATE — added <SpeedInsightsClient /> (field RUM):
//   Placement: direct child of <body>, AFTER the provider tree.
//     - It renders no UI and consumes no context (intl/theme/query),
//       so nesting it inside the providers would be pure noise.
//     - Last-in-body matches Vercel's official quickstart placement.
//   Gate: rendered ONLY when `process.env.VERCEL` is set (Vercel
//   sets VERCEL=1 on its build/runtime). Server-side check by design:
//     - Lighthouse CI + local `next start` are NOT on Vercel — there
//       the collector script would 404 and the console error would
//       ding our own best-practices audit. Gated ⇒ clean lab runs.
//     - Vercel preview + production get full real-user vitals.
//   CSP: zero changes needed — strict-dynamic propagates trust to
//   the runtime-injected collector, and Task #45 already allowlisted
//   va.vercel-scripts.com / vitals.vercel-insights.com as backup.
//   (Full rationale: components/providers/speed-insights.tsx.)
// ═══════════════════════════════════════════════════════════════

import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { AppProvider } from '@/components/providers/app-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { PostHogProvider } from '@/components/providers/posthog-provider';
import { MotionConfigProvider } from '@/components/motion';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/config';
import { LOCALES } from '@/i18n/config';
import { buildAlternates } from '@/lib/seo/alternates';
import type { Metadata } from 'next';
import { LocaleFont } from '@/components/locale-font';
import { TranslationBanner } from '@/components/translation-banner';
import { getNonce } from '@/lib/csp/get-nonce';
import { SpeedInsightsClient } from '@/components/providers/speed-insights';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    // Task #53.5 W3-A: canonical + full hreflang set + x-default in
    // ONE helper, so child pages can override alternates without
    // losing the language cluster (Next merges this field shallowly).
    alternates: buildAlternates(locale),
    openGraph: {
      locale: locale === 'hi' ? 'hi_IN' : 'en_IN',
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) =>
        l === 'hi' ? 'hi_IN' : l === 'en' ? 'en_IN' : `${l}_IN`,
      ),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  // ── Read per-request CSP nonce (set by proxy.ts) ──
  // Empty string on static routes (hash-based CSP) — that's fine.
  const nonce = await getNonce();

  return (
    <html lang={locale} className={locale === 'en' ? inter.variable : ''} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <PostHogProvider>
              <MotionConfigProvider>
                <LocaleFont nonce={nonce || undefined} />
                <ThemeProvider
                  attribute="class"
                  defaultTheme="light"
                  enableSystem
                  disableTransitionOnChange
                  nonce={nonce || undefined}
                >
                  <TranslationBanner />
                  <AppProvider>{children}</AppProvider>
                  <Toaster richColors position="top-right" />
                </ThemeProvider>
              </MotionConfigProvider>
            </PostHogProvider>
          </QueryProvider>
        </NextIntlClientProvider>
        {/* ── Task #53: real-user Core Web Vitals (Vercel-only) ──
            Server-side VERCEL gate keeps Lighthouse CI / local
            `next start` free of a 404'ing collector script. */}
        {process.env.VERCEL ? <SpeedInsightsClient /> : null}
      </body>
    </html>
  );
}
