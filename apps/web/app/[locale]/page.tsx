// apps/web/app/[locale]/page.tsx
// ═══════════════════════════════════════════════════════════════
// COMING SOON PAGE — Datun pre-launch single-viewport hero
// Replaces v1 on datunai.com (v1 deleted).
//
// Task #45 (CSP):
//   The inline <script type="application/ld+json"> block below is DATA, not
//   executable script — browsers never run it, so CSP script-src never
//   evaluates it. No nonce or hash is required for JSON-LD.
// ═══════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BRAND, CONTACTS, URLS } from '@repo/shared';
import { buildAlternates, localeUrl } from '@/lib/seo/alternates';
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

  return {
    title: t('meta.homeTitle'),
    description: t('meta.homeDescription'),
    // W3 hotfix-2: home owns its alternates now that the locale layout
    // no longer emits them (layouts can't know the leaf path).
    alternates: buildAlternates(locale, ''),
    openGraph: {
      title: t('meta.homeTitle'),
      description: t('meta.homeDescription'),
      url: localeUrl(locale, ''),
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

  // Task #54 E2E catch: SkipToContent targets #main-content, but this page
  // builds its own <main> (no PageShell) — the skip link was a dead anchor.
  // id + tabIndex={-1} make Enter actually land focus here (SC 2.4.1).
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground"
      role="main"
    >
      <AuroraBg />

      <header className="relative z-10 flex items-center justify-between px-4 py-5 sm:px-8 sm:py-6">
        {/* Task #54 r2: translucent glass over AuroraBg = unverifiable
            background (dark run measured the blend at #9d9fa3 → 2.2:1).
            Opaque bg-card makes the ratio deterministic in BOTH themes;
            text-foreground/80 on card ≥ 8:1. */}
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-3.5 py-1.5 text-xs font-medium text-foreground/80">
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
