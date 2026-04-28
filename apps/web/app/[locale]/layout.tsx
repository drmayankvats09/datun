// ═══════════════════════════════════════════════════════════════
// LOCALE LAYOUT — Main layout with i18n + all providers
// This is the REAL layout — root layout is just a passthrough.
// next-intl sets <html lang={locale}> here.
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

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Generate static params for all locales (SSG)
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

  // Validate locale
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering for this locale
  setRequestLocale(locale);

  // Load messages for this locale
  const messages = await getMessages();

  return (
    <html lang={locale} className={locale === 'en' ? inter.variable : ''} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages}>
          <LocaleFont />
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
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
