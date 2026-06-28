// packages/shared/src/schema-factory.ts
// ═══════════════════════════════════════════════════════════════
// SCHEMA FACTORY — pure JSON-LD builders (Task #55, Section C).
//
// Per-page-type schema.org node builders, ALL referencing the same canonical
// Organization @id (./entity/organization), so the homepage and every future
// route emit a consistent brand-entity graph with zero hand-authored literals.
//
// LAW: zero runtime dependencies (no zod / node builtins). Returns plain
// objects; the <JsonLd> server component JSON.stringify's them with the CSP
// nonce. Isomorphic + tree-shakeable — safe in the root @repo/shared barrel.
// ═══════════════════════════════════════════════════════════════

import { BRAND } from './brand';
import { URLS } from './urls';
import { ORGANIZATION, ORGANIZATION_ID, WEBSITE_ID } from './entity/organization';

/** A schema.org graph node (untyped on purpose — schema.org is open-vocabulary). */
export type JsonLdNode = Record<string, unknown>;

const BASE = URLS.websiteHttps;

/** A pair feeding an FAQPage Question/Answer. */
export interface FaqEntry {
  q: string;
  a: string;
}

/** A breadcrumb crumb. */
export interface Crumb {
  name: string;
  item: string;
}

/** MedicalOrganization — the canonical Datun entity (doubles as Organization). */
export function buildOrganizationSchema(): JsonLdNode {
  return {
    '@type': 'MedicalOrganization',
    '@id': ORGANIZATION.id,
    name: ORGANIZATION.name,
    // alternateName (=== name) and image (=== logo) are omitted on purpose: they
    // carry zero incremental signal to search/AI engines and only add inline
    // JSON-LD bytes (Task #55 — Lighthouse document-budget hardening).
    legalName: ORGANIZATION.legalName,
    slogan: ORGANIZATION.slogan,
    description: ORGANIZATION.description,
    url: ORGANIZATION.url,
    logo: ORGANIZATION.logo,
    foundingDate: ORGANIZATION.foundingDate,
    medicalSpecialty: 'Dentistry',
    areaServed: { '@type': 'Country', name: ORGANIZATION.areaServed },
    knowsLanguage: [...ORGANIZATION.knowsLanguage],
    knowsAbout: [...ORGANIZATION.knowsAbout],
    sameAs: [...ORGANIZATION.sameAs],
  };
}

/** WebSite + SearchAction — site-wide; identical on every route. */
export function buildWebSiteSchema(opts: { inLanguage: string }): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: BASE,
    name: BRAND.name,
    inLanguage: opts.inLanguage,
    publisher: { '@id': ORGANIZATION_ID },
    // No SearchAction yet: a sitelinks searchbox requires a working on-site
    // search endpoint (e.g. /search?q=). Declaring one without it is misleading
    // and Google distrusts unbacked SearchActions — re-add when search ships
    // (Task #55 interlink audit).
  };
}

/** WebPage / MedicalWebPage for a single content page, linked to the entity. */
export function buildWebPageSchema(opts: {
  url: string;
  name: string;
  description: string;
  inLanguage: string;
  dateModified?: string;
  type?: 'WebPage' | 'MedicalWebPage';
}): JsonLdNode {
  const node: JsonLdNode = {
    '@type': opts.type ?? 'WebPage',
    '@id': `${opts.url}#webpage`,
    url: opts.url,
    name: opts.name,
    description: opts.description,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORGANIZATION_ID },
    inLanguage: opts.inLanguage,
  };
  if (opts.dateModified) node.dateModified = opts.dateModified;
  return node;
}

/** FAQPage from Q/A pairs. `inLanguage` declares the language the answers are
 *  actually written in (not necessarily the route locale). */
export function buildFaqPageSchema(opts: {
  url: string;
  faqs: readonly FaqEntry[];
  inLanguage: string;
}): JsonLdNode {
  return {
    '@type': 'FAQPage',
    '@id': `${opts.url}#faq`,
    inLanguage: opts.inLanguage,
    mainEntity: opts.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/** BreadcrumbList from ordered crumbs. */
export function buildBreadcrumbSchema(opts: { url: string; items: readonly Crumb[] }): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${opts.url}#breadcrumb`,
    itemListElement: opts.items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
}

/** Wrap nodes into one @graph document for a single <script> tag. */
export function buildGraph(nodes: JsonLdNode[]): JsonLdNode {
  return { '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) };
}

/** Site-wide entity graph (Organization + WebSite) — emitted on EVERY route via
 *  the locale layout so any new page inherits the Datun entity with zero work. */
export function buildGlobalEntityGraph(opts: { inLanguage: string }): JsonLdNode {
  return buildGraph([buildOrganizationSchema(), buildWebSiteSchema(opts)]);
}
