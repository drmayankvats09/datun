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
//
// PRE-STAGED for future tasks (commented OUT until task ships):
//   - PostHog (Task #49 — feature flags)
//   - Razorpay (Task #53 — payment checkout)
//   - Google Tag Manager (Task #58 — GTM container)
// ═══════════════════════════════════════════════════════════════

export const SCRIPT_ORIGINS = {
  sentry: ['https://browser.sentry-cdn.com', 'https://js.sentry-cdn.com'],
  cloudflareInsights: ['https://static.cloudflareinsights.com'],
  vercelAnalytics: ['https://va.vercel-scripts.com'],

  // ── Pre-staged for Task #49 (PostHog) — UNCOMMENT when task ships ──
  // posthog: ['https://app.posthog.com', 'https://us-assets.i.posthog.com'],

  // ── Pre-staged for Task #53 (Razorpay) — UNCOMMENT when task ships ──
  // razorpay: ['https://checkout.razorpay.com'],

  // ── Pre-staged for Task #58 (Google Tag Manager) — UNCOMMENT when task ships ──
  // gtm: ['https://www.googletagmanager.com', 'https://www.google-analytics.com'],
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
// ═══════════════════════════════════════════════════════════════

export const CONNECT_ORIGINS = {
  datunApi: ['https://api.datunai.com'],
  sentryIngest: ['https://*.ingest.sentry.io', 'https://*.sentry.io'],
  cloudflareInsights: ['https://cloudflareinsights.com'],
  vercelAnalytics: ['https://vitals.vercel-insights.com'],
  cloudinaryUpload: ['https://api.cloudinary.com'],

  // ── Pre-staged for Task #49 (PostHog) ──
  // posthog: ['https://app.posthog.com', 'https://us.i.posthog.com'],

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
