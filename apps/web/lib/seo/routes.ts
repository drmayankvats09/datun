// apps/web/lib/seo/routes.ts
// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTE REGISTRY — single source of truth for sitemap.xml
// (Task #53.5 W3-A · implements PDF #10/#105)
//
// HOW FUTURE PAGES JOIN THE SITEMAP (the "auto" Mayank asked for):
//   Add ONE line below. app/sitemap.ts multiplies every entry by
//   all 10 locales and emits hreflang alternates automatically —
//   no other file changes, ever. Anything NOT listed here is
//   invisible to crawlers by design (consult/[id], /admin, /auth
//   callbacks, /offline, /api).
//
// Why a registry and not filesystem scanning: route groups,
// dynamic segments and locale prefixes make fs-globbing fragile
// and silently wrong (next-sitemap proved this — it shipped a
// sitemap with zero locale URLs). One explicit line per page is
// FAANG-boring and FAANG-correct.
// ═══════════════════════════════════════════════════════════════

export interface PublicRoute {
  /** Path AFTER the locale segment. Homepage = ''. */
  path: string;
  priority: number;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  /** Honest last content-change date (ISO yyyy-mm-dd). Sourced from the page's
   *  own JSON-LD dateModified (legal pages) or its source file's git commit date
   *  (auth pages), NEVER build time — so <lastmod> stays trustworthy and an
   *  unchanged page keeps its date across deploys. Must equal any visible /
   *  schema date the page shows (Task #55 D1/D2; Google ignores churned lastmod). */
  lastModified: string;
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  // lastModified mirrors each page's real content date: homepage = its
  // LAST_REVIEWED (keep in sync with app/[locale]/page.tsx); legal pages = their
  // own JSON-LD dateModified; auth pages = their source file's git commit date.
  { path: '', priority: 1.0, changeFrequency: 'weekly', lastModified: '2026-06-26' },
  { path: '/login', priority: 0.8, changeFrequency: 'monthly', lastModified: '2026-06-13' },
  { path: '/signup', priority: 0.9, changeFrequency: 'monthly', lastModified: '2026-06-13' },
  {
    path: '/forgot-password',
    priority: 0.3,
    changeFrequency: 'yearly',
    lastModified: '2026-06-13',
  },
  { path: '/privacy', priority: 0.5, changeFrequency: 'monthly', lastModified: '2026-04-23' },
  { path: '/terms', priority: 0.5, changeFrequency: 'monthly', lastModified: '2026-04-23' },
  { path: '/cookies', priority: 0.4, changeFrequency: 'monthly', lastModified: '2026-04-23' },
  { path: '/dpdp-notice', priority: 0.5, changeFrequency: 'monthly', lastModified: '2026-04-23' },
  // /accessibility legal page exists + is footer-linked but was missing from the
  // sitemap (Task #55 D3 — clean sitemap includes every live, indexable page).
  { path: '/accessibility', priority: 0.4, changeFrequency: 'yearly', lastModified: '2026-06-12' },
];
