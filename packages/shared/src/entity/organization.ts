// packages/shared/src/entity/organization.ts
// ═══════════════════════════════════════════════════════════════
// ENTITY — Canonical Datun organization (Task #55, Section C).
//
// Single source of truth for the brand-entity graph that every page emits, so
// search engines + AI answer engines resolve ONE canonical "Datun" dental
// entity across the whole site (now and forever). Consumed by the schema
// factory (./schema-factory) and, through it, by the <JsonLd> component.
//
// LAW: zero runtime dependencies (no zod, no node builtins) — this module sits
// in the root @repo/shared barrel, which ~129 files (incl. 30+ client
// components) import, so it MUST stay isomorphic and tree-shakeable. It only
// reads the plain BRAND / URLS constants.
//
// Supersedes the stale, unused SEO.organizationSchema in ./seo (which had a
// wrong foundingDate, a /logo.svg path that does not exist, and per-page drift).
// ═══════════════════════════════════════════════════════════════

import { BRAND } from '../brand';
import { URLS } from '../urls';

const BASE = URLS.websiteHttps;

/** Stable @id for the Datun Organization node. Reused by every page's graph so
 *  the entity is one node search/AI engines can anchor to (never re-minted). */
export const ORGANIZATION_ID = `${BASE}/#organization`;

/** Stable @id for the site-wide WebSite node. */
export const WEBSITE_ID = `${BASE}/#website`;

/** The locked brand positioning line. Byte-identical everywhere it appears
 *  (meta title, footer descriptor, schema slogan) — do not localize this token. */
export const BRAND_DESCRIPTOR = "India's most trusted dental platform";

/** Locales Datun publishes in (BCP-47 short tags) — schema.org knowsLanguage. */
export const KNOWS_LANGUAGE = ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu', 'kn', 'ml', 'pa'] as const;

/** Dental topics Datun genuinely covers (schema.org knowsAbout) — honest scope,
 *  mirrors the homepage problems + procedures + tourism breadth. */
export const KNOWS_ABOUT = [
  'Toothache',
  'Tooth sensitivity',
  'Cavity',
  'Bleeding gums',
  'Bad breath',
  'Broken tooth',
  'Wisdom tooth',
  'Dental implant',
  'Clear aligners',
  'Braces',
  'Root canal treatment',
  'Dental crown',
  'Teeth whitening',
  'Scaling and cleaning',
  'Dental filling',
  'Smile makeover',
  'Dental tourism',
] as const;

/** sameAs — ONLY profiles that are currently LIVE. Never invent URLs. Adding
 *  Crunchbase / LinkedIn / Wikidata / X later is a one-line edit here. */
export const ORGANIZATION_SAME_AS: readonly string[] = [
  URLS.social.instagram,
  URLS.social.linkedin,
];

/** Canonical organization config — the typed inputs the schema factory turns
 *  into a MedicalOrganization JSON-LD node. */
export const ORGANIZATION = {
  id: ORGANIZATION_ID,
  name: BRAND.name,
  alternateName: [BRAND.name] as readonly string[],
  legalName: BRAND.legalName,
  /** brand positioning (schema slogan) */
  slogan: BRAND_DESCRIPTOR,
  description: BRAND.description,
  url: BASE,
  logo: `${BASE}/brand/datun-wordmark.svg`,
  image: `${BASE}/brand/datun-icon.svg`,
  /** YEAR ONLY — never invent a month/day. */
  foundingDate: '2026',
  areaServed: 'India',
  knowsLanguage: KNOWS_LANGUAGE,
  knowsAbout: KNOWS_ABOUT,
  sameAs: ORGANIZATION_SAME_AS,
} as const;
