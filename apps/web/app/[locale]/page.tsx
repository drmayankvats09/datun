// apps/web/app/[locale]/page.tsx
// ═══════════════════════════════════════════════════════════════
// PATIENT HOMEPAGE (Task #55) — replaces the coming-soon page.
// Built on the @repo/ui design-system foundation; 14 sections to the
// locked visual target (docs/design-system/home-preview.html).
//
// Server Component by default; the only interactivity is the @repo/ui
// <SiteHeader> (sticky + mobile drawer), which is a client component.
//
// CSP (fix #5): the inline JSON-LD <script> carries the per-request
// nonce from getNonce() — the app runs a strict-dynamic CSP.
// ═══════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@repo/ui';
import { BRAND, URLS } from '@repo/shared';
import { buildAlternates, localeUrl } from '@/lib/seo/alternates';
import { getNonce } from '@/lib/csp/get-nonce';
import {
  HomeLogo,
  Hero,
  TrustStrip,
  Manifesto,
  HowItWorks,
  TwoDoors,
  WhyDatun,
  ConditionLinks,
  Cities,
  PatientStories,
  TourismTeaser,
  AnswersTeaser,
  ForClinics,
  FinalCta,
  SiteFooter,
} from '@/components/home/sections';
import '@/components/home/home.css';

type Props = { params: Promise<{ locale: string }> };

function lp(locale: string, path: string): string {
  return locale === 'en' ? path : `/${locale}${path}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });

  return {
    title: t('meta.homeTitle'),
    description: t('meta.homeDescription'),
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
  const nonce = await getNonce();

  const navLinks = [
    { label: t('home.nav.how'), href: '#how' },
    { label: t('home.nav.find'), href: '#find' },
    { label: t('home.nav.learn'), href: '#learn' },
    { label: t('home.nav.tourism'), href: '#tourism' },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    legalName: BRAND.legalName,
    url: URLS.websiteHttps,
    description: BRAND.description,
    sameAs: [URLS.social.instagram, URLS.social.linkedin],
  };

  return (
    <div className="dtn-home">
      <SiteHeader
        logo={<HomeLogo />}
        links={navLinks}
        ctaLabel={t('home.cta.ask')}
        ctaHref={lp(locale, '/consult')}
        loginHref={lp(locale, '/login')}
        clinicsHref="https://clinics.datunai.com"
      />

      <main id="main" tabIndex={-1}>
        <Hero locale={locale} />
        <TrustStrip locale={locale} />
        <Manifesto locale={locale} />
        <HowItWorks locale={locale} />
        <TwoDoors locale={locale} />
        <WhyDatun locale={locale} />
        <ConditionLinks locale={locale} />
        <Cities locale={locale} />
        <PatientStories locale={locale} />
        <TourismTeaser locale={locale} />
        <AnswersTeaser locale={locale} />
        <ForClinics locale={locale} />
        <FinalCta locale={locale} />
      </main>

      <SiteFooter locale={locale} />

      <script
        type="application/ld+json"
        nonce={nonce || undefined}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
