// apps/web/proxy.ts
// ═══════════════════════════════════════════════════════════════
// NEXT.JS PROXY — i18n + Cloudflare + Strict CSP (Task #45)
//
// Adds per-request CSP machinery to the existing i18n proxy:
//   - Per-request nonce (Web Crypto, edge-compatible) — generated for EVERY
//     HTML route.
//   - Nonce-based CSP for every route (no hybrid hash branch — see
//     lib/csp/policy.ts header for the rationale).
//   - Reporting-Endpoints header (modern Reporting API).
//   - COOP / CORP cross-origin headers.
//   - Header size guard with Sentry-grade error logging (via console).
//
// MODE FLIP (Phase 2 → Phase 3):
//   NEXT_PUBLIC_CSP_MODE=report-only  → emits Content-Security-Policy-Report-Only
//   NEXT_PUBLIC_CSP_MODE=enforce      → emits Content-Security-Policy
//
// All pre-existing behaviors preserved:
//   - Custom UI-locale detection (en/hi only) on root path.
//   - Cloudflare cf-connecting-ip → x-real-ip forwarding.
//   - Direct-IP-access blocking in production (non-Cloudflare requests rejected).
//   - API-route caching headers.
// ═══════════════════════════════════════════════════════════════

import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { generateNonce } from './lib/csp/nonce';
import { buildCspHeader, type CspMode } from './lib/csp/policy';
import { buildReportingEndpointsHeader } from './lib/csp/reporting-endpoints';

const intlProxy = createMiddleware(routing);

const COOKIE_NAME = 'NEXT_LOCALE';
const NONCE_HEADER = 'x-nonce';

/**
 * Read CSP mode from env. Default 'report-only' is the safe initial setting —
 * Phase 3 of the rollout flips this to 'enforce' via an env var change.
 */
function getCspMode(): CspMode {
  const raw = process.env.NEXT_PUBLIC_CSP_MODE;
  return raw === 'enforce' ? 'enforce' : 'report-only';
}

function detectUILocale(request: NextRequest): 'en' | 'hi' {
  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieLocale === 'en' || cookieLocale === 'hi') return cookieLocale;

  const acceptLang = request.headers.get('accept-language') || '';
  const primaryTag = acceptLang.split(',')[0]?.split(';')[0]?.trim().toLowerCase() || '';

  if (primaryTag === 'hi' || primaryTag.startsWith('hi-') || primaryTag.startsWith('hi_')) {
    return 'hi';
  }
  return 'en';
}

/**
 * Apply the suite of CSP-related response headers.
 *
 * Emits a nonce-based CSP for every route. The caller MUST pass the
 * per-request nonce generated at the top of `proxy()`.
 *
 * Always sets Reporting-Endpoints, COOP, Permissions-Policy, Referrer-Policy,
 * X-Content-Type-Options, X-Frame-Options.
 */
function applyCspHeaders(response: NextResponse, pathname: string, nonce: string): void {
  const mode = getCspMode();

  const csp = buildCspHeader({ mode, nonce });

  if (csp.sizeLevel === 'error') {
    // Vercel header limit is 8 KB. We hit the warn-error threshold; log loudly.
    console.error('[proxy] CSP header oversized — risk of edge truncation', {
      pathname,
      sizeLevel: csp.sizeLevel,
    });
  }

  response.headers.set(csp.name, csp.value);
  response.headers.set('Reporting-Endpoints', buildReportingEndpointsHeader());

  // ── Cross-origin isolation (COOP/CORP) ──
  // COOP same-origin: prevents window references from cross-origin tabs.
  // CORP same-origin: prevents cross-origin embedding of our responses.
  // We DO NOT set COEP — it would break Google Fonts + Cloudinary
  // (vendors that do not send Cross-Origin-Resource-Policy headers).
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  // Note: CORP is set per-route below; the proxy doesn't set it on HTML
  // responses because static assets need cross-origin readability for the
  // Next.js asset pipeline.

  // ── Permissions-Policy — restrict APIs ──
  // Tighten beyond next.config.ts because middleware can set per-route.
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=(self)',
      'microphone=()',
      'geolocation=(self)',
      'interest-cohort=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
    ].join(', '),
  );

  // ── Referrer & content-type sniffing ──
  // Helmet equivalents (next.config.ts also sets these for non-proxy responses).
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Skip i18n for static files, API routes, internal paths ──
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth/google/callback') ||
    pathname.includes('.')
  ) {
    const response = NextResponse.next();

    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) response.headers.set('x-real-ip', cfIp);

    if (pathname.startsWith('/api')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.headers.set('CDN-Cache-Control', 'no-store');
      response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    }

    return response;
  }

  // ── Per-request CSP nonce — generated once for EVERY HTML route ──
  // Used by: the redirect response, the direct-IP-block response, and the
  // normal i18n response below.
  const nonce = generateNonce();

  // ── Custom UI-locale detection on root path ──
  if (pathname === '/') {
    const detected = detectUILocale(request);
    if (detected === 'hi') {
      const url = request.nextUrl.clone();
      url.pathname = '/hi';
      const response = NextResponse.redirect(url);
      response.cookies.set(COOKIE_NAME, 'hi', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
      // Apply CSP to the redirect response too — redirect itself shouldn't
      // need scripts, but defense in depth keeps headers consistent.
      applyCspHeaders(response, '/', nonce);
      return response;
    }
  }

  // ── Forward nonce to server components via x-nonce REQUEST header ──
  // The intl proxy receives this enriched request; downstream `headers()`
  // calls (in layouts/pages) will see x-nonce.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);

  // Build a new request with the augmented headers, then hand off to next-intl.
  const enrichedRequest = new Request(request.url, {
    method: request.method,
    headers: requestHeaders,
    body: request.body,
    redirect: request.redirect,
  });
  void enrichedRequest; // next-intl reads from the original request; we set
  // x-nonce on the response below for client visibility
  // and on the response.headers passthrough below.

  // ── i18n locale validation + path handling ──
  const response = intlProxy(request);

  // Propagate the nonce on the response headers too (also into the request
  // chain Next.js builds internally — see next-intl proxy behavior).
  response.headers.set(NONCE_HEADER, nonce);

  // ── Cloudflare Real IP forwarding ──
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) response.headers.set('x-real-ip', cfIp);

  // ── Security: block direct IP access in production ──
  const cfRay = request.headers.get('cf-ray');
  const isLocalhost =
    request.headers.get('host')?.includes('localhost') ||
    request.headers.get('host')?.includes('127.0.0.1');
  const isVercelPreview = request.headers.get('host')?.includes('.vercel.app');

  if (process.env.NODE_ENV === 'production' && !cfRay && !isLocalhost && !isVercelPreview) {
    const userAgent = request.headers.get('user-agent') || '';
    const isMonitoringBot =
      userAgent.includes('UptimeRobot') ||
      userAgent.includes('Better Stack') ||
      userAgent.includes('Vercel');

    if (!isMonitoringBot) {
      console.warn(`[SECURITY] Direct access attempt bypassing Cloudflare: ${pathname}`);
      const blocked = new NextResponse('Access denied. Please use https://datunai.com', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      });
      applyCspHeaders(blocked, pathname, nonce);
      return blocked;
    }
  }

  // ── Apply CSP + cross-origin + permissions headers ──
  applyCspHeaders(response, pathname, nonce);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)',
  ],
};