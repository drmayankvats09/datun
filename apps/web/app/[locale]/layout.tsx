// apps/web/app/[locale]/layout.tsx
// ═══════════════════════════════════════════════════════════════
// LOCALE LAYOUT — Main layout with i18n + all providers + CSP nonce
//
// CSP nonce flow (Task #45):
//   1. proxy.ts generates a per-request nonce and sets `x-nonce` header.
//   2. This layout reads it via getNonce().
//   3. Nonce is forwarded to:
//        - ThemeProvider (next-themes v0.4.6+ supports `nonce` prop).
//        - LocaleFont (uses nonce when injecting dynamic <link> stylesheet).
//
// For static routes (landing, legal), getNonce() returns ''. ThemeProvider
// receives '' which is safe — the static-route CSP allows inline scripts
// by hash, not nonce, so absence of nonce attribute is correct.
// ═══════════════════════════════════════════════════════════════

import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { AppProvider } from '@/components/providers/app-provider';
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
