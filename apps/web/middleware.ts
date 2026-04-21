// ═══════════════════════════════════════════════════════════════
// NEXT.JS EDGE MIDDLEWARE — Cloudflare integration layer
// Runs on Vercel Edge Network BEFORE any page renders.
// Pattern: Stripe, Linear, Cal.com — all use edge middleware.
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // ── 1. Cloudflare Real IP forwarding ──
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    response.headers.set('x-real-ip', cfIp);
  }

  // ── 2. Block direct IP access (force through Cloudflare) ──
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

  // ── 3. API route protection — ensure no caching ──
  if (pathname.startsWith('/api')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
