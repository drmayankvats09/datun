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
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: '', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/login', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/signup', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/forgot-password', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/cookies', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/dpdp-notice', priority: 0.5, changeFrequency: 'monthly' },
];
