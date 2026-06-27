// apps/web/app/[locale]/page.tsx
// ═══════════════════════════════════════════════════════════════
// PATIENT HOMEPAGE (Task #55) — world-class rebuild.
//
// Server Component by default; the only client islands are the @repo/ui
// <SiteHeader> (sticky + mobile drawer), the language switcher, and the
// reviews carousel. All marketing content is server-rendered (RSC) so it is
// fully parseable by search + AI answer engines.
//
// Section order follows the patient-page architecture:
//   Hero -> Trust strip -> How it works -> Two ways in -> Common problems ->
//   Common procedures -> Why-trust + comparison -> Mission -> Verified dentists
//   -> Patient reviews -> Dental tourism -> FAQ -> Final CTA -> Footer.
//
// CSP: the inline JSON-LD <script> carries the per-request nonce from
// getNonce() (the app runs a strict-dynamic CSP). The schema graph is built
// from the same data that renders on the page, so markup never drifts.
// ═══════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteHeader } from '@repo/ui';
import {
  BRAND,
  buildGraph,
  buildWebPageSchema,
  buildFaqPageSchema,
  buildBreadcrumbSchema,
} from '@repo/shared';
import { buildAlternates, localeUrl } from '@/lib/seo/alternates';
import { JsonLd } from '@/components/seo/json-ld';
import {
  HomeLogo,
  Hero,
  TrustStrip,
  HowItWorks,
  TwoDoors,
  CommonProblems,
  CommonProcedures,
  WhyDatun,
  Mission,
  VerifiedDentists,
  PatientReviews,
  DentalTourism,
  Faq,
  FinalCta,
  SiteFooter,
} from '@/components/home/sections';
import { FAQS } from '@/components/home/data';
import '@/components/home/home.css';

type Props = { params: Promise<{ locale: string }> };

/** The homepage's last content review (an honest freshness signal for GEO). */
const LAST_REVIEWED = '2026-06-26';

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

  const navLinks = [
    { label: t('home.nav.how'), href: '#how' },
    { label: t('home.nav.find'), href: '#find' },
    { label: t('home.nav.learn'), href: '#learn' },
    { label: t('home.nav.tourism'), href: '#tourism' },
  ];

  // Page-specific structured data — the site-wide Organization + WebSite graph is
  // emitted once by the locale layout (Task #55 C). WebPage carries the honest
  // freshness signal; FAQPage mirrors the same FAQS the accordion renders;
  // BreadcrumbList anchors the page. All reference the canonical Organization @id
  // through the factory, so the entity never drifts.
  const homeUrl = localeUrl(locale, '');
  const pageGraph = buildGraph([
    buildWebPageSchema({
      url: homeUrl,
      name: t('meta.homeTitle'),
      description: t('meta.homeDescription'),
      inLanguage: locale,
      dateModified: LAST_REVIEWED,
    }),
    // FAQ answers are authored in English on every route (body-copy i18n is a
    // tracked follow-up), so declare the real text language, not the locale.
    buildFaqPageSchema({ url: homeUrl, faqs: FAQS, inLanguage: 'en' }),
    buildBreadcrumbSchema({ url: homeUrl, items: [{ name: 'Home', item: homeUrl }] }),
  ]);

  return (
    <div className="dtn-home">
      <SiteHeader
        logo={<HomeLogo />}
        homeHref={lp(locale, '/')}
        links={navLinks}
        ctaLabel={t('home.cta.ask')}
        ctaHref={lp(locale, '/consult')}
        loginHref={lp(locale, '/login')}
        clinicsHref="https://clinics.datunai.com"
      />

      <main id="main-content" tabIndex={-1}>
        <Hero locale={locale} />
        <TrustStrip locale={locale} />
        <HowItWorks locale={locale} />
        <TwoDoors locale={locale} />
        <CommonProblems locale={locale} />
        <CommonProcedures locale={locale} />
        <WhyDatun locale={locale} />
        <Mission locale={locale} />
        <VerifiedDentists locale={locale} />
        <PatientReviews locale={locale} />
        <DentalTourism locale={locale} />
        <Faq locale={locale} />
        <FinalCta locale={locale} />
      </main>

      <SiteFooter locale={locale} />

      <JsonLd data={pageGraph} />
    </div>
  );
}
