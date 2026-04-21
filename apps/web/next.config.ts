import type { NextConfig } from 'next';

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

  // ── Security Headers ──
  // Cloudflare adds some headers at edge, but these are origin-level
  // headers that Cloudflare passes through. Defense in depth.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent MIME sniffing attacks
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          // Clickjacking protection — only allow embedding from own domain
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },

          // XSS protection (legacy browsers)
          { key: 'X-XSS-Protection', value: '1; mode=block' },

          // Control referrer information sent with requests
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // Permissions Policy — disable unused browser APIs
          {
            key: 'Permissions-Policy',
            value: [
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
          },

          // Content Security Policy — strict but functional
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://static.cloudflareinsights.com https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://res.cloudinary.com https://*.cloudflare.com",
              "font-src 'self' https://fonts.gstatic.com",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'https://dentscan-ai-backend-production.up.railway.app'} https://static.cloudflareinsights.com https://cloudflareinsights.com https://va.vercel-scripts.com https://*.sentry.io`,
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "worker-src 'self' blob:",
              "form-action 'self'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
      {
        // Static assets — immutable cache (content-hashed by Next.js)
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Favicon + static public assets — 1 week cache
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

export default nextConfig;
