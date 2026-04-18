// ═══════════════════════════════════════════════════════════════
// SEO — Search engine optimization config
// Structured data, meta defaults, social card settings.
// Pattern: Next.js metadata API, Google structured data guidelines.
// ═══════════════════════════════════════════════════════════════

import { BRAND } from './brand';
import { URLS } from './urls';

export const SEO = {
  /** Default meta title suffix */
  titleTemplate: `%s | ${BRAND.name}`,

  /** Default meta description */
  defaultDescription: BRAND.description,

  /** Default locale */
  locale: 'en_IN',

  /** Supported locales for hreflang */
  locales: ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'pa'] as const,

  /** Open Graph defaults */
  og: {
    type: 'website' as const,
    siteName: BRAND.name,
    locale: 'en_IN',
  },

  /** Twitter card defaults */
  twitter: {
    card: 'summary_large_image' as const,
    site: '@datunai',
  },

  /** JSON-LD structured data for the organization */
  organizationSchema: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.name,
    legalName: BRAND.legalName,
    url: URLS.websiteHttps,
    logo: `${URLS.websiteHttps}/logo.svg`,
    description: BRAND.description,
    foundingDate: '2025',
    founder: {
      '@type': 'Person',
      name: 'Dr. Mayank Vats',
      jobTitle: 'Founder & CEO',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-87960-64170',
      contactType: 'customer support',
      availableLanguage: ['English', 'Hindi'],
    },
    sameAs: [URLS.social.instagram, URLS.social.linkedin],
  },

  /** Medical WebApplication structured data */
  medicalAppSchema: {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: BRAND.name,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    description: BRAND.description,
  },

  /** Target keywords for content strategy */
  targetKeywords: [
    'online dental consultation India',
    'AI dental assistant',
    'free dental checkup online',
    'toothache home remedy',
    'best dentist near me',
    'dental AI India',
    'teeth pain treatment online',
    'gum bleeding solution',
    'cavity treatment cost India',
    'dental consultation free',
  ] as const,
} as const;
