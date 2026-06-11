import type { Metadata, Viewport } from 'next';
import { BRAND } from '@repo/shared';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://datunai.com'),
  robots: {
    // W3 hotfix-2: explicit opt-OUT instead of origin inference.
    // The old `APP_URL === prod` guard flipped to noindex on ANY
    // non-prod origin — including the Lighthouse CI build (localhost),
    // which tanked `is-crawlable` on every page (SEO 0.92 → 0.58).
    // Now: indexable by default; set NEXT_PUBLIC_NOINDEX=1 only on
    // deploys that must stay hidden (Vercel Preview environment).
    // Vercel additionally sends X-Robots-Tag: noindex on *.vercel.app
    // preview URLs itself, so previews stay protected either way.
    index: process.env.NEXT_PUBLIC_NOINDEX !== '1',
    follow: process.env.NEXT_PUBLIC_NOINDEX !== '1',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
