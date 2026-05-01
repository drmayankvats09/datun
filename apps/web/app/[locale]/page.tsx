// ═══════════════════════════════════════════════════════════════
// COMING SOON PAGE — Datun pre-launch single-viewport hero
// Replaces v1 on datunai.com (v1 deleted).
// ═══════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BRAND, CONTACTS, URLS } from '@repo/shared';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { AuroraBg } from '@/components/coming-soon/aurora-bg';
import { BrandMark } from '@/components/coming-soon/brand-mark';
import { HeroContent } from '@/components/coming-soon/hero-content';
import { PrimaryActions } from '@/components/coming-soon/primary-actions';
import { StatusFooter } from '@/components/coming-soon/status-footer';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || URLS.websiteHttps;

  return {
    title: t('meta.homeTitle'),
    description: t('meta.homeDescription'),
    openGraph: {
      title: t('meta.homeTitle'),
      description: t('meta.homeDescription'),
      url: `${baseUrl}/${locale}`,
      siteName: BRAND.name,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('meta.homeTitle'),
      description: t('meta.homeDescription'),
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'common' });

  const strings = {
    brandName: t('brand.name'),
    mission: t('homepage.mission'),
    headline: t('homepage.headline'),
    subheadline: t('homepage.subheadline'),
    buildStatus: t('homepage.buildStatus'),
    ctaWhatsApp: t('homepage.ctaWhatsApp'),
    ctaNotify: t('homepage.ctaNotify'),
    ctaNotifySubject: t('homepage.ctaNotifySubject'),
    ctaNotifyBody: t('homepage.ctaNotifyBody'),
    languages: t('homepage.languages'),
    copyright: t('footer.copyright', { year: new Date().getFullYear() }),
  };

  return (
    <main
      className="relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground"
      role="main"
    >
      <AuroraBg />

      <header className="relative z-10 flex items-center justify-between px-4 py-5 sm:px-8 sm:py-6">
        <div
          className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
          }}
        >
          <span aria-hidden="true" className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span>{strings.buildStatus}</span>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex w-full max-w-3xl flex-col items-center text-center">
          <BrandMark brandName={strings.brandName} />
          <HeroContent
            mission={strings.mission}
            headline={strings.headline}
            subheadline={strings.subheadline}
          />
          <PrimaryActions
            ctaWhatsAppLabel={strings.ctaWhatsApp}
            ctaNotifyLabel={strings.ctaNotify}
            whatsappPhone={CONTACTS.supportPhone}
            notifyEmail={CONTACTS.supportEmail}
            notifySubject={strings.ctaNotifySubject}
            notifyBody={strings.ctaNotifyBody}
          />
        </div>
      </div>

      <StatusFooter languagesLabel={strings.languages} copyrightLabel={strings.copyright} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: BRAND.name,
            legalName: BRAND.legalName,
            url: URLS.websiteHttps,
            description: BRAND.description,
            sameAs: [URLS.social.instagram, URLS.social.linkedin],
          }),
        }}
      />
    </main>
  );
}
