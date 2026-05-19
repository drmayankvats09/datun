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
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/config';
import { LOCALES } from '@/i18n/config';
import type { Metadata } from 'next';
import { LocaleFont } from '@/components/locale-font';
import { TranslationBanner } from '@/components/translation-banner';
import { getNonce } from '@/lib/csp/get-nonce';

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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://datunai.com';

  return {
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: Object.fromEntries(LOCALES.map((loc) => [loc, `${baseUrl}/${loc}`])),
    },
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
            </PostHogProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
