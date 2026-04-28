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
    // Production (datunai.com): allow indexing. Preview/dev: block.
    index: process.env.NEXT_PUBLIC_APP_URL === 'https://datunai.com',
    follow: process.env.NEXT_PUBLIC_APP_URL === 'https://datunai.com',
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
