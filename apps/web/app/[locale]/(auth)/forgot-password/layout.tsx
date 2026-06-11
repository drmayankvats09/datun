// apps/web/app/[locale]/(auth)/forgot-password/layout.tsx
// ═══════════════════════════════════════════════════════════════
// RESET PASSWORD — metadata shell (Task #53.5 W3 hotfix-2)
//
// The page itself is a client component ('use client') and therefore
// cannot export metadata. This per-route server layout exists ONLY to
// own the SEO head for /forgot-password: title + per-locale canonical + the
// 10-language hreflang cluster (+ x-default). The locale layout no
// longer emits alternates (a layout cannot know its leaf path), so
// without this file the page would ship with no canonical at all.
// ═══════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import { buildAlternates } from '@/lib/seo/alternates';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'Reset password',
    description: 'Reset your Datun account password.',
    alternates: buildAlternates(locale, '/forgot-password'),
  };
}

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
