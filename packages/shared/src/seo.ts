// ═══════════════════════════════════════════════════════════════
// SEO — Search engine optimization config
// Structured data, meta defaults, social card settings.
// Pattern: Next.js metadata API, Google structured data guidelines.
// ═══════════════════════════════════════════════════════════════

import { BRAND } from './brand';

export const SEO = {
  /** Default meta title suffix */
  titleTemplate: `%s | ${BRAND.name}`,

  /** Default meta description */
  defaultDescription: BRAND.description,

  /** Default locale */
  locale: 'en_IN',

  /** Supported locales for hreflang */
  locales: ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa'] as const,

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

  // JSON-LD structured data now lives in the canonical entity module (Task #55):
  //   @repo/shared → ./entity/organization + ./schema-factory
  //   (buildOrganizationSchema / buildWebSiteSchema / buildWebPageSchema /
  //    buildFaqPageSchema / buildBreadcrumbSchema / buildGlobalEntityGraph).
  // The old organizationSchema + medicalAppSchema here were unused and had
  // drifted (foundingDate 2025, a non-existent /logo.svg, a ₹0 Offer) — removed
  // so there is ONE source of truth for the brand entity.

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
