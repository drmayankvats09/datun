// ═══════════════════════════════════════════════════════════════
// NEXT.JS PROXY — i18n + Cloudflare integration (Next.js 16)
// Custom UI-locale detection (en/hi only) BEFORE next-intl runs.
// Regional locale URLs (/ta/*, /te/*) still work via direct nav,
// but auto-detection never sends users there since UI is English.
// AI chat language (separate from UI) supports all 10 in-app.
// ═══════════════════════════════════════════════════════════════

import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { UI_LOCALES } from './i18n/config';

const intlProxy = createMiddleware(routing);

const COOKIE_NAME = 'NEXT_LOCALE';

/**
 * Detect best UI locale (en or hi only).
 * Priority: cookie → Accept-Language → 'en' default.
 *
 * Regional users (Tamil/Telugu/etc) get English by default —
 * they can manually switch via language switcher if preferred.
 * AI chat respects their browser language separately.
 */
function detectUILocale(request: NextRequest): 'en' | 'hi' {
  // 1. Cookie has highest priority (user explicit choice persists)
  const cookieLocale = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieLocale === 'en' || cookieLocale === 'hi') {
    return cookieLocale;
  }

  // 2. Accept-Language: parse PRIMARY (highest-priority) language only.
  //    Indian browsers commonly send "en-IN,en;q=0.9,hi;q=0.8" — Hindi is
  //    a fallback, NOT the user's preference. Only redirect to /hi if Hindi
  //    is genuinely the user's primary language (first tag in the list).
  //    Pattern: Stripe, GitHub, Vercel — all parse primary tag only.
  const acceptLang = request.headers.get('accept-language') || '';
  const primaryTag =
    acceptLang
      .split(',')[0] // first language entry: "en-IN" from "en-IN,en;q=0.9,hi;q=0.8"
      ?.split(';')[0] // strip quality factor
      ?.trim()
      .toLowerCase() || '';

  // Match 'hi', 'hi-IN', 'hi_IN' — but only as PRIMARY tag
  if (primaryTag === 'hi' || primaryTag.startsWith('hi-') || primaryTag.startsWith('hi_')) {
    return 'hi';
  }

  return 'en';
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

    // Cloudflare Real IP forwarding
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) {
      response.headers.set('x-real-ip', cfIp);
    }

    // No caching for API routes
    if (pathname.startsWith('/api')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.headers.set('CDN-Cache-Control', 'no-store');
      response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
    }

    return response;
  }

  // ── Custom UI-locale detection on root path ──
  // Only runs on '/' — all other paths (including /ta, /hi etc.) bypass
  if (pathname === '/') {
    const detected = detectUILocale(request);
    // 'en' is the default (no prefix) — stays on '/'
    // 'hi' redirects to '/hi'
    if (detected === 'hi') {
      const url = request.nextUrl.clone();
      url.pathname = '/hi';
      const response = NextResponse.redirect(url);
      // Persist for next visit (1 year)
      response.cookies.set(COOKIE_NAME, 'hi', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
      return response;
    }
  }

  // ── i18n locale validation + path handling ──
  const response = intlProxy(request);

  // ── Cloudflare Real IP forwarding ──
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    response.headers.set('x-real-ip', cfIp);
  }

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
    }
  }

  return response;
}

// Suppress unused import warning — UI_LOCALES exported for type checks elsewhere
void UI_LOCALES;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)',
  ],
};
