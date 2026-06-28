// apps/web/next.config.ts
// ═══════════════════════════════════════════════════════════════
// NEXT.JS CONFIG — Web app build configuration
//
// SECURITY HEADERS:
//   CSP and related cross-origin headers are NOW set per-request by
//   apps/web/proxy.ts. We no longer set them here, because next.config.ts
//   headers are static (no per-request nonce access). This file retains
//   only asset-cache headers and image-domain configuration.
//
// SENTRY:
//   Production builds are wrapped by @sentry/nextjs for source-map upload.
//
// TASK #52 PHASE 5 — PWA headers:
//   - /sw.js          → MUST NOT be cached by the browser HTTP cache;
//                        the SW lifecycle relies on byte-comparison of
//                        the freshly-fetched script. `no-store` matches
//                        the `updateViaCache: 'none'` we set in
//                        lib/sw/register.ts.
//   - /manifest.json  → cached for 24h (changes rarely; safe to cache)
//   - /offline.html   → cached for 24h; pre-cached by the SW on install
//   - /404.html       → platform-served by Vercel on edge errors;
//                        cached aggressively (purely static)
//   - /500.html       → same as 404.html
// ═══════════════════════════════════════════════════════════════

import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Guarantee tree-shaking for the monorepo barrels that many client components
  // import, so the entity/schema-factory constants never leak into client chunks
  // (Task #55 — Lighthouse script-budget hardening).
  experimental: {
    optimizePackageImports: ['@repo/shared', '@repo/ui'],
  },

  images: {
    // Task #46 — Cloudflare Images custom loader for delivery.
    // The loader file builds imagedelivery.net URLs per requested width.
    // We keep `remotePatterns` for completeness (legacy <img> tags, OG
    // image fetchers) and to allow the dev experience to work without
    // the loader override locally.
    loader: 'custom',
    loaderFile: './lib/media/cloudflare-loader.ts',
    formats: ['image/avif', 'image/webp'],
    // Pre-defined width breakpoints — `next/image` picks the closest.
    // Tuned for our Cloudflare variants: 200 (thumbnail), 640 (medium),
    // 1200 (large). Extra entries support intermediate srcset sizes.
    deviceSizes: [200, 320, 480, 640, 768, 1024, 1280, 1568],
    imageSizes: [16, 32, 48, 64, 96, 128, 200, 256, 384],
    // Cache the optimised images for 7 days on the Next.js cache layer.
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      // Legacy — kept until all Cloudinary references are migrated.
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Cloudflare Images delivery hostname.
      { protocol: 'https', hostname: 'imagedelivery.net' },
      // R2 public bucket hostname (configured per-environment).
      // The wildcard subdomain covers media.datunai.com and any future
      // subdomain we use for public R2 assets.
      { protocol: 'https', hostname: '**.datunai.com' },
    ],
  },

  async headers() {
    return [
      // ── Long-cache headers for static assets ──
      // The CSP + cross-origin headers are now applied by proxy.ts on a
      // per-request basis (so the nonce is correct). We only keep
      // cache-control here for static asset URLs.
      {
        source: '/(.*)\\.(ico|png|jpg|jpeg|svg|webp|gif|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, stale-while-revalidate=86400',
          },
        ],
      },

      // ── Task #52 Phase 5: Service worker MUST bypass HTTP cache ──
      //
      // Browsers use byte-comparison of the SW script to detect
      // updates. If the script is HTTP-cached, updates won't propagate
      // until the cache expires. `no-store` forces every check to hit
      // the origin.
      //
      // Service-Worker-Allowed: '/' lets the SW control the entire
      // origin even though it lives at /sw.js (the default scope is
      // the script's directory).
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate, no-store' },
          { key: 'Service-Worker-Allowed', value: '/' },
          // Content-Type override — Next.js's static handler usually
          // sets this correctly for .js, but being explicit avoids
          // edge runtime quirks.
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },

      // ── PWA manifest — moderate cache, allows quick updates ──
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
        ],
      },

      // ── Offline page — same cache as manifest ──
      {
        source: '/offline.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
          { key: 'Content-Type', value: 'text/html; charset=utf-8' },
        ],
      },

      // ── Vercel platform 404 / 500 — long cache; they're static ──
      {
        source: '/:status(404|500).html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
          { key: 'Content-Type', value: 'text/html; charset=utf-8' },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const wrappedConfig = withNextIntl(nextConfig);

// Sentry wraps config only in production builds.
export default process.env.NODE_ENV === 'production'
  ? withSentryConfig(wrappedConfig, {
      org: process.env['SENTRY_ORG'],
      project: process.env['SENTRY_PROJECT'],
      silent: true,
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
      reactComponentAnnotation: { enabled: true },
      widenClientFileUpload: true,
      // ── Task #53.5 W2 (CUT-4b): SDK dead-weight stripping ──
      // Build-time flag replacement inside the Sentry SDK source:
      //   - excludeDebugStatements: drops the SDK's debug-logging
      //     branches from production output.
      //   - excludeReplayShadowDom / excludeReplayIframe: Replay is
      //     lazy-loaded (sentry.client.config.ts) AND records with
      //     maskAllText + blockAllMedia. shadcn/Radix render through
      //     portals, not shadow DOM, and we embed no third-party
      //     iframes — both capture paths are dead weight, shrinking
      //     the deferred replay chunk further.
      // excludeReplayWorker is intentionally NOT set: the
      // compression worker stays, so the sampled 5% of sessions
      // don't burn main-thread CPU compressing recordings.
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
        excludeReplayShadowDom: true,
        excludeReplayIframe: true,
      },
      tunnelRoute: '/monitoring',
    })
  : wrappedConfig;
