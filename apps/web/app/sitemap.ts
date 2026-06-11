// apps/web/app/sitemap.ts
// ═══════════════════════════════════════════════════════════════
// SITEMAP.XML — native App Router route (Task #53.5 W3-A · PDF
// #10/#105). One registry line in lib/seo/routes.ts = the page
// appears here in all 10 languages with full hreflang alternates,
// automatically, forever. Served as a real route — immune to the
// postbuild/Vercel asset-collection failure that killed
// next-sitemap's output (see app/robots.ts header for the
// forensic story). next-sitemap is removed from the repo in the
// same change.
// ═══════════════════════════════════════════════════════════════

import type { MetadataRoute } from 'next';
import { DEFAULT_LOCALE, LOCALES } from '@/i18n/config';
import { localeUrl } from '@/lib/seo/alternates';
import { PUBLIC_ROUTES } from '@/lib/seo/routes';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_ROUTES.flatMap((route) => {
    // Identical alternates object for every locale variant of a
    // page — Google treats the set as one mutual hreflang cluster.
    const languages = {
      ...Object.fromEntries(LOCALES.map((loc) => [loc, localeUrl(loc, route.path)])),
      'x-default': localeUrl(DEFAULT_LOCALE, route.path),
    };

    return LOCALES.map((locale) => ({
      url: localeUrl(locale, route.path),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: { languages },
    }));
  });
}
