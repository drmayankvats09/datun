// apps/web/lib/csp/allowed-origins.ts
// ═══════════════════════════════════════════════════════════════
// CSP ALLOWED ORIGINS — Single source of truth for all third-party CSP allowlists
//
// Add a new vendor here → tests validate → policy.ts auto-includes it.
// Remove a vendor → tests fail until references cleaned.
//
// CATEGORIZATION RATIONALE:
//   - SCRIPT_*       → script-src (loads + executes JavaScript)
//   - STYLE_*        → style-src (loads + applies CSS)
//   - FONT_*         → font-src (loads font files)
//   - IMG_*          → img-src (loads images, including SVG)
//   - CONNECT_*      → connect-src (fetch/XHR/WebSocket destinations)
//   - FRAME_*        → frame-src (iframes — payment gateways, OAuth popups)
//
// Each category groups origins by VENDOR (sentry, posthog, razorpay) so that
// CSP additions are explicit and reviewable in PRs.
//
// NAMING:
//   - Wildcards (`https://*.sentry.io`) only when vendor's CDN architecture
//     requires it. NEVER `https://*` or schema-less `*`.
//   - http:// origins ONLY for localhost dev (env-gated). Tests assert no
//     http:// in production set.
//
// Pattern: Stripe API CSP requirements doc, Cloudflare Workers AllowList.
//
// TASK #49 UPDATE — activated PostHog SCRIPT + CONNECT origins.
//   The host names cover PostHog EU Cloud (eu.i.posthog.com) and the
//   static asset CDN (eu-assets.i.posthog.com). Browser SDK loads scripts
//   from the asset CDN, then POSTs events to the main host.
// ═══════════════════════════════════════════════════════════════

/** Helper: flatten a vendor-grouped category into a unique string array. */
function flatten(record: Record<string, readonly string[]>): readonly string[] {
  const seen = new Set<string>();
  for (const origins of Object.values(record)) {
    for (const origin of origins) seen.add(origin);
  }
  return Array.from(seen);
}

// ═══════════════════════════════════════════════════════════════
// SCRIPT-SRC — JavaScript execution sources
// ═══════════════════════════════════════════════════════════════
// Currently ACTIVE in Datun:
//   - Sentry browser SDK (error tracking + Session Replay)
//   - Cloudflare Insights beacon (analytics)
//   - Vercel Analytics (web vitals)
//   - PostHog (Task #49 — analytics + feature flag bootstrap)
//
// PRE-STAGED for future tasks (commented OUT until task ships):
//   - Razorpay (Task #53 — payment checkout)
//   - Google Tag Manager (Task #58 — GTM container)
// ═══════════════════════════════════════════════════════════════

export const SCRIPT_ORIGINS = {
  sentry: ['https://browser.sentry-cdn.com', 'https://js.sentry-cdn.com'],
  cloudflareInsights: ['https://static.cloudflareinsights.com'],
  vercelAnalytics: ['https://va.vercel-scripts.com'],

  // Task #49 — PostHog browser SDK + asset CDN
  posthog: ['https://eu-assets.i.posthog.com'],

  // ── Pre-staged for Task #53 (Razorpay) — UNCOMMENT when task ships ──
  // razorpay: ['https://checkout.razorpay.com'],

  // ── Pre-staged for Task #58 (Google Tag Manager) — UNCOMMENT when task ships ──
  googleAnalytics: ['https://www.googletagmanager.com', 'https://www.google-analytics.com'],
} as const satisfies Record<string, readonly string[]>;

/** Flattened script-src list. */
export const SCRIPT_SRC_ORIGINS = flatten(SCRIPT_ORIGINS);

// ═══════════════════════════════════════════════════════════════
// STYLE-SRC — Stylesheet load sources
// ═══════════════════════════════════════════════════════════════
// Google Fonts stylesheets are loaded dynamically by locale-font.tsx for
// non-Latin scripts (Hindi/Tamil/Telugu/etc.).
// ═══════════════════════════════════════════════════════════════

export const STYLE_ORIGINS = {
  googleFonts: ['https://fonts.googleapis.com'],
} as const satisfies Record<string, readonly string[]>;

export const STYLE_SRC_ORIGINS = flatten(STYLE_ORIGINS);

// ═══════════════════════════════════════════════════════════════
// FONT-SRC — Font file (.woff2 etc.) load sources
// ═══════════════════════════════════════════════════════════════

export const FONT_ORIGINS = {
  googleFontsCdn: ['https://fonts.gstatic.com'],
} as const satisfies Record<string, readonly string[]>;

export const FONT_SRC_ORIGINS = flatten(FONT_ORIGINS);

// ═══════════════════════════════════════════════════════════════
// IMG-SRC — Image load sources
// ═══════════════════════════════════════════════════════════════
// `data:` URIs are allowed via the policy builder (not here) for inline
// data: images (e.g., placeholder SVGs, base64 thumbnails before upload).
// `blob:` is allowed via the policy builder for client-generated images
// (canvas exports, photo previews before upload).
// ═══════════════════════════════════════════════════════════════

export const IMG_ORIGINS = {
  cloudinary: ['https://res.cloudinary.com'],
  cloudflare: ['https://*.cloudflare.com'],
  // Task #46 — Cloudflare Images delivery + R2 public hostname
  cloudflareImages: ['https://imagedelivery.net'],
  r2Public: ['https://*.datunai.com'],
} as const satisfies Record<string, readonly string[]>;

export const IMG_SRC_ORIGINS = flatten(IMG_ORIGINS);

// ═══════════════════════════════════════════════════════════════
// CONNECT-SRC — XHR / fetch / WebSocket / EventSource destinations
// ═══════════════════════════════════════════════════════════════
// CRITICAL: Sentry uses both browser-cdn (script-src) AND ingest endpoints
// (connect-src) — they're different. Browser SDK loads from browser.sentry-cdn,
// then POSTs error events to *.ingest.sentry.io.
//
// PostHog (Task #49) follows the same dual-host pattern: SDK loads from
// eu-assets.i.posthog.com, then POSTs analytics events to eu.i.posthog.com.
// ═══════════════════════════════════════════════════════════════

export const CONNECT_ORIGINS = {
  datunApi: ['https://api.datunai.com'],
  sentryIngest: ['https://*.ingest.sentry.io', 'https://*.sentry.io'],
  cloudflareInsights: ['https://cloudflareinsights.com'],
  vercelAnalytics: ['https://vitals.vercel-insights.com'],
  cloudinaryUpload: ['https://api.cloudinary.com'],

  // Task #49 — PostHog event ingest + decide endpoint.
  // Task #54 fix — eu-assets.i.posthog.com added: PostHog lazy-loads
  // feature modules (web-vitals, surveys, session-recorder) and their
  // source maps from the ASSETS host via fetch. connect-src is NOT
  // covered by 'strict-dynamic' (same GA4 lesson below), so without
  // this host those fetches are blocked — the exact pair of console
  // violations seen on 12 Jun 26. The dual-host pattern was already
  // documented in this file's header; the list now matches it.
  posthog: ['https://eu.i.posthog.com', 'https://eu-assets.i.posthog.com'],

  // GA4 (gtag) POSTs measurement beacons here. connect-src is NOT
  // affected by 'strict-dynamic', so without these the gtag script
  // loads but every event POST is blocked -> zero data in GA
  // (the same failure mode PostHog hit).
  googleAnalytics: [
    'https://www.google-analytics.com',
    'https://analytics.google.com',
    'https://region1.google-analytics.com',
  ],

  // ── Pre-staged for Task #53 (Razorpay API) ──
  // razorpay: ['https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
} as const satisfies Record<string, readonly string[]>;

export const CONNECT_SRC_ORIGINS = flatten(CONNECT_ORIGINS);

// ═══════════════════════════════════════════════════════════════
// FRAME-SRC — iframe content sources (payment widgets, OAuth popups)
// ═══════════════════════════════════════════════════════════════

export const FRAME_ORIGINS = {
  // Currently empty — Datun has no iframes in v2.
  // ── Pre-staged for Task #53 (Razorpay checkout iframe) ──
  // razorpay: ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
  // ── Pre-staged for Task #20 (Google OAuth popup — currently uses redirect) ──
  // googleOAuth: ['https://accounts.google.com'],
} as const satisfies Record<string, readonly string[]>;

export const FRAME_SRC_ORIGINS = flatten(FRAME_ORIGINS);

// ═══════════════════════════════════════════════════════════════
// REPORT ENDPOINT — Where browsers POST CSP violations
// ═══════════════════════════════════════════════════════════════
// Reports go to API (not web), so `api.datunai.com` (already in CONNECT_ORIGINS).
// Used by reporting-endpoints.ts to build `Reporting-Endpoints` header.
// ═══════════════════════════════════════════════════════════════

export const REPORT_ENDPOINT_URL = 'https://api.datunai.com/api/security/csp-report';

// ═══════════════════════════════════════════════════════════════
// AGGREGATE EXPORT — Useful for tests + length-guard
// ═══════════════════════════════════════════════════════════════

export const ALL_ORIGINS: readonly string[] = [
  ...SCRIPT_SRC_ORIGINS,
  ...STYLE_SRC_ORIGINS,
  ...FONT_SRC_ORIGINS,
  ...IMG_SRC_ORIGINS,
  ...CONNECT_SRC_ORIGINS,
  ...FRAME_SRC_ORIGINS,
];
