// apps/web/lib/csp/route-classification.ts
// ═══════════════════════════════════════════════════════════════
// ROUTE CLASSIFICATION — static vs dynamic CSP decision
//
// HYBRID CSP DECISION TREE:
//   - STATIC routes  → hash-based CSP (SSG-friendly, build-time hashes)
//   - DYNAMIC routes → nonce-based CSP (per-request, requires SSR)
//
// SAFETY-FIRST CLASSIFICATION:
//   Unknown routes default to DYNAMIC (more secure). Adding a new static
//   route is OPT-IN — you explicitly add a pattern to STATIC_PATTERNS.
//
// REGEX DESIGN:
//   - Locale prefix `[a-z]{2,3}` matches en, hi, ta, te, bn, gu, kn, ml, mr, pa
//     (Datun's 10 supported locales — defined in i18n/config.ts)
//   - Trailing `/?` allows both `/en/privacy` and `/en/privacy/`
//   - `$` anchor prevents accidental matches like `/en/privacy-policy-fake`
//
// EVOLUTION:
//   When Task #95 (blog) ships, add `/^\/[a-z]{2,3}\/blog(\/[^/]+)?\/?$/`.
//   When Task #97 (clinic SEO pages) ships, add their pattern here.
//
// Pattern: Next.js App Router static export docs, Cal.com route classification.
// ═══════════════════════════════════════════════════════════════

/**
 * Regex patterns that match STATIC routes.
 *
 * Add a new entry here when a new SSG-friendly page ships.
 * If unsure, leave the route dynamic (safer default).
 */
const STATIC_PATTERNS: readonly RegExp[] = [
  // Root (`/`) — landing redirects to /en
  /^\/$/,

  // Locale roots (`/en`, `/hi`, `/ta`, etc.)
  /^\/[a-z]{2,3}\/?$/,

  // Legal pages: /en/privacy, /hi/terms, /ta/cookies, /te/dpdp-notice
  /^\/[a-z]{2,3}\/(privacy|terms|cookies|dpdp-notice)\/?$/,

  // Future: blog → add `/^\/[a-z]{2,3}\/blog(\/[^/]+)?\/?$/`
  // Future: clinic SEO pages → add `/^\/[a-z]{2,3}\/dentists-in-[^/]+\/?$/`
];

/** Classification result. Mirror of `CspRouteType` in policy.ts. */
export type RouteClassification = 'static' | 'dynamic';

/**
 * Classify a pathname as static or dynamic for CSP purposes.
 *
 * @param pathname - The URL path (e.g., `/en/privacy`, `/consult/abc-123`).
 * @returns `'static'` if path matches a known SSG pattern, else `'dynamic'`.
 *
 * @example
 *   classifyRoute('/en/privacy');       // 'static'
 *   classifyRoute('/en/consult/xyz');   // 'dynamic'
 *   classifyRoute('/unknown/route');    // 'dynamic' (safe default)
 */
export function classifyRoute(pathname: string): RouteClassification {
  for (const pattern of STATIC_PATTERNS) {
    if (pattern.test(pathname)) return 'static';
  }
  return 'dynamic';
}

/** Exported for tests — lets them inspect the pattern list. */
export const __testing__ = {
  STATIC_PATTERNS,
};
