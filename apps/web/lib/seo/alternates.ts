// apps/web/lib/seo/alternates.ts
// ═══════════════════════════════════════════════════════════════
// CANONICAL + HREFLANG BUILDER (Task #53.5 W3 combined)
//
// Two bugs died here:
// 1. Next metadata merging is SHALLOW per field — a page exporting
//    `alternates: { canonical }` wipes the layout's languages map.
//    Every page now builds the object through this helper so
//    canonical and the 10-language cluster always travel together.
// 2. routing uses localePrefix 'as-needed': the DEFAULT locale (en)
//    carries NO /en prefix in real URLs. The old canonical pointed
//    every English page at /en — a URL users never land on — which
//    is exactly the `canonical` audit failure Lighthouse named
//    ("points to another hreflang location"). localeUrl() is now
//    the single source of locale-aware URL truth, shared with
//    sitemap.ts and llms.txt.
// ═══════════════════════════════════════════════════════════════

import { DEFAULT_LOCALE, LOCALES } from '@/i18n/config';
import { URLS } from '@repo/shared';

const BASE = process.env.NEXT_PUBLIC_APP_URL || URLS.websiteHttps;

/** Public URL for a locale+path under localePrefix 'as-needed'. */
export function localeUrl(locale: string, path = ''): string {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  return `${BASE}${prefix}${path}` || `${BASE}/`;
}

export function buildAlternates(locale: string, path = '') {
  return {
    canonical: localeUrl(locale, path),
    languages: {
      ...Object.fromEntries(LOCALES.map((loc) => [loc, localeUrl(loc, path)])),
      'x-default': localeUrl(DEFAULT_LOCALE, path),
    },
  };
}
