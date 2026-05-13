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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
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
