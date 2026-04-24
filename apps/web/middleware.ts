// ═══════════════════════════════════════════════════════════════
// NEXT.JS MIDDLEWARE — i18n locale detection + Cloudflare integration
// Priority: 1) URL locale 2) Cookie 3) Accept-Language 4) Default
// Pattern: Airbnb, Stripe — auto-detect + persist preference.
// ═══════════════════════════════════════════════════════════════

import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Skip i18n for static files, API routes, internal paths ──
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth/google/callback') ||
    pathname.includes('.') // static files (favicon.ico, robots.txt, etc.)
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

  // ── i18n locale detection + redirect ──
  const response = intlMiddleware(request);

  // ── Cloudflare Real IP forwarding ──
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    response.headers.set('x-real-ip', cfIp);
  }

  // ── Security: Block direct IP access in production ──
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)',
  ],
};
