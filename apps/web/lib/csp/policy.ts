// apps/web/lib/csp/policy.ts
// ═══════════════════════════════════════════════════════════════
// CSP POLICY BUILDER — Hybrid nonce/hash architecture
//
// HYBRID DESIGN (CTO decision Day 16, post-review with Opus 4.6):
//   - Dynamic routes (auth, consult, admin)  → nonce-based CSP (per-request)
//   - Static routes  (landing, legal, blog)  → hash-based CSP (build-time)
//
// Why? Nonce-based CSP REQUIRES dynamic rendering. If we force every page
// dynamic, we lose:
//   - SEO-friendly SSG for marketing pages
//   - CDN edge caching at Vercel/Cloudflare
//   - Sub-200ms TTFB on landing page
//
// Hash-based CSP works at build time: we SHA-256 the inline JSON-LD blocks,
// add `'sha256-...'` to script-src. Pages stay SSG. Tradeoff: hash registry
// must regenerate when JSON-LD content changes (handled by build script).
//
// STRICT-DYNAMIC RATIONALE:
//   `'strict-dynamic'` tells modern browsers: "If a script has my nonce/hash,
//    treat its dynamically-inserted child scripts as trusted." This lets
//    nonced bootstrap scripts (e.g., Next.js __NEXT_DATA__) load real code
//    without needing each individual URL in script-src.
//
//   IMPORTANT: When `'strict-dynamic'` is present, modern browsers IGNORE
//   allowlisted hosts in script-src (treats them as if absent). The host
//   allowlist is kept ONLY for CSP Level 1 / legacy browsers (Safari < 15.4,
//   IE Edge Legacy). Modern browsers use nonce + strict-dynamic exclusively.
//   This is INTENTIONAL — opus 4.6 review surfaced this as a clarity gap.
//
// MODE FLIP (Phase 3):
//   `mode: 'report-only'` → emits Content-Security-Policy-Report-Only header
//   `mode: 'enforce'`     → emits Content-Security-Policy header
//   Same policy content — only the header name differs.
//
// Pattern: Stripe strict-CSP, Google web.dev/strict-csp,
//          MDN CSP best practices (2026).
// ═══════════════════════════════════════════════════════════════

import {
  SCRIPT_SRC_ORIGINS,
  STYLE_SRC_ORIGINS,
  FONT_SRC_ORIGINS,
  IMG_SRC_ORIGINS,
  CONNECT_SRC_ORIGINS,
  FRAME_SRC_ORIGINS,
  REPORT_ENDPOINT_URL,
} from './allowed-origins';
import { assertHeaderSize, HeaderSizeLevel } from './header-size-guard';

/** CSP enforcement mode. */
export type CspMode = 'enforce' | 'report-only';

/** Route classification — determines whether to use nonce or hash. */
export type CspRouteType = 'static' | 'dynamic';

/** Input options to build a CSP header. */
export interface BuildCspOptions {
  /** Policy mode — controls which response header to use. */
  mode: CspMode;

  /** Route type — controls nonce vs hash strategy. */
  routeType: CspRouteType;

  /** Per-request nonce (required for dynamic routes, ignored for static). */
  nonce?: string;

  /** Inline-script hashes (required for static routes, ignored for dynamic). */
  hashes?: readonly string[];

  /**
   * Override report endpoint for tests.
   * Production always uses `REPORT_ENDPOINT_URL` from allowed-origins.ts.
   */
  reportEndpoint?: string;
}

/** Resulting CSP header — name + value pair, ready to set on response. */
export interface CspHeader {
  /** HTTP header name (`Content-Security-Policy` or `...-Report-Only`). */
  name: 'Content-Security-Policy' | 'Content-Security-Policy-Report-Only';

  /** Header value (the full directives string). */
  value: string;

  /**
   * Size class — emitted by length guard.
   * `'ok' | 'warning' | 'error'` — caller can log warnings without throwing.
   */
  sizeLevel: HeaderSizeLevel;
}

/**
 * Build a complete CSP header from policy inputs.
 *
 * @throws Error if `routeType === 'dynamic'` but `nonce` is missing.
 * @throws Error if `routeType === 'static'` but `hashes` is missing.
 *
 * @example
 *   const { name, value } = buildCspHeader({
 *     mode: 'enforce',
 *     routeType: 'dynamic',
 *     nonce: generateNonce(),
 *   });
 *   response.headers.set(name, value);
 */
export function buildCspHeader(opts: BuildCspOptions): CspHeader {
  if (opts.routeType === 'dynamic' && !opts.nonce) {
    throw new Error('CSP build: dynamic route requires a nonce');
  }
  if (opts.routeType === 'static' && (!opts.hashes || opts.hashes.length === 0)) {
    // Static pages with no inline scripts are still valid — emit empty hashes.
    // We only throw if `hashes` is explicitly undefined (caller forgot).
    if (opts.hashes === undefined) {
      throw new Error('CSP build: static route requires a hashes array (can be empty)');
    }
  }

  const reportUri = opts.reportEndpoint ?? REPORT_ENDPOINT_URL;

  // ── script-src ─────────────────────────────────────────────────
  // Strategy:
  //   - dynamic: 'self' + 'strict-dynamic' + 'nonce-...' + hosts (legacy fallback)
  //   - static : 'self' + 'strict-dynamic' + 'sha256-...' + hosts (legacy fallback)
  //
  // 'unsafe-inline' is ABSENT from both — that's the whole point.
  // 'unsafe-eval' is ABSENT — no eval() in production code.
  // ─────────────────────────────────────────────────────────────
  const scriptSrcParts: string[] = ["'self'", "'strict-dynamic'"];

  if (opts.routeType === 'dynamic') {
    scriptSrcParts.push(`'nonce-${opts.nonce}'`);
  } else {
    // Add each hash (already prefixed `sha256-`, `sha384-`, or `sha512-`)
    for (const hash of opts.hashes ?? []) {
      scriptSrcParts.push(`'${hash}'`);
    }
  }

  // Legacy host allowlist — IGNORED by modern browsers when strict-dynamic is present.
  // Kept for CSP Level 1 fallback (Safari < 15.4, very old Chrome).
  for (const origin of SCRIPT_SRC_ORIGINS) scriptSrcParts.push(origin);

  // 'https:' fallback for absolute legacy browsers — they ignore the rest.
  scriptSrcParts.push('https:');

  // ── style-src ──────────────────────────────────────────────────
  // 'unsafe-inline' allowed for styles because:
  //   - Next.js inlines critical CSS at build time
  //   - shadcn/ui injects runtime style attributes (style="--foo: bar")
  //   - style-src-attr directive doesn't support nonces at all (CSP spec gap)
  //
  // STYLE injection attacks are FAR less severe than script injection:
  //   - Can't exfiltrate data (no JS access)
  //   - Can't redirect users
  //   - Worst case: visual defacement
  //
  // Pattern: Next.js docs explicitly recommend 'unsafe-inline' for styles
  // even in strict CSP setups. Stripe, Linear, Vercel — all do the same.
  // ─────────────────────────────────────────────────────────────
  const styleSrcParts: string[] = ["'self'", "'unsafe-inline'", ...STYLE_SRC_ORIGINS];

  // ── img-src ────────────────────────────────────────────────────
  // `data:` for inline SVGs / base64 thumbnails (next/image generates these).
  // `blob:` for client-generated images (photo preview before upload).
  // ─────────────────────────────────────────────────────────────
  const imgSrcParts: string[] = ["'self'", 'data:', 'blob:', ...IMG_SRC_ORIGINS];

  // ── font-src ───────────────────────────────────────────────────
  const fontSrcParts: string[] = ["'self'", 'data:', ...FONT_SRC_ORIGINS];

  // ── connect-src ────────────────────────────────────────────────
  // Includes API, Sentry ingest, analytics endpoints.
  // 'self' covers same-origin XHR (next.js Server Actions, internal /api).
  // ─────────────────────────────────────────────────────────────
  const connectSrcParts: string[] = ["'self'", ...CONNECT_SRC_ORIGINS];

  // ── frame-src ──────────────────────────────────────────────────
  // Empty in v2 (no payment integrations yet). Razorpay (#53) will add.
  // ─────────────────────────────────────────────────────────────
  const frameSrcParts: string[] = ["'self'", ...FRAME_SRC_ORIGINS];

  // ── worker-src ─────────────────────────────────────────────────
  // Service workers (PWA, future). `blob:` for inline workers.
  // ─────────────────────────────────────────────────────────────
  const workerSrcParts: string[] = ["'self'", 'blob:'];

  // ── Build the directive string ─────────────────────────────────
  const directives: string[] = [
    `default-src 'self'`,
    `script-src ${scriptSrcParts.join(' ')}`,
    `style-src ${styleSrcParts.join(' ')}`,
    `img-src ${imgSrcParts.join(' ')}`,
    `font-src ${fontSrcParts.join(' ')}`,
    `connect-src ${connectSrcParts.join(' ')}`,
    `frame-src ${frameSrcParts.join(' ')}`,
    `worker-src ${workerSrcParts.join(' ')}`,
    `manifest-src 'self'`,
    `media-src 'self'`,
    // Hard blocks — these CANNOT have any source.
    `object-src 'none'`, // No <object> / <embed> / <applet>
    `base-uri 'self'`, // <base href="..."> attacks blocked
    `form-action 'self'`, // Form posts can only go to our origin
    `frame-ancestors 'none'`, // No one can iframe our site (clickjack defense)
    // Force HTTP → HTTPS upgrade for ALL sub-resources.
    `upgrade-insecure-requests`,
    // Modern reporting (Reporting API).
    `report-to csp-endpoint`,
    // Legacy fallback (browsers that don't support report-to yet).
    `report-uri ${reportUri}`,
  ];

  const value = directives.join('; ');

  const sizeLevel = assertHeaderSize(value);

  const name: CspHeader['name'] =
    opts.mode === 'enforce' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only';

  return { name, value, sizeLevel };
}
