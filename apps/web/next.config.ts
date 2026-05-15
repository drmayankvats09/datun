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
// ═══════════════════════════════════════════════════════════════

import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

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
      authToken: process.env['SENTRY_AUTH_TOKEN'],
    })
  : wrappedConfig;
