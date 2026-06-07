// apps/web/app/[locale]/offline/page.tsx
// ═══════════════════════════════════════════════════════════════
// OFFLINE PAGE — Task #52 Phase 3 (NEW)
//
// The page the Phase 5 Service Worker redirects to when the user
// is offline AND the requested route hasn't been pre-cached.
//
// Why a dedicated page (not a banner / toast):
//   - When SW catches a network error, it returns a fully-rendered
//     HTML response — toast / banner systems aren't available because
//     the React tree hasn't loaded yet. A standalone page is the
//     reliable surface.
//   - 2026 PWA best practice (post the React Native Web wave) is to
//     pair an inline OnlineStatusBanner (already exists in
//     AppProvider) with a fallback /offline page for cold-load
//     scenarios. We now have BOTH layers.
//
// SERVER COMPONENT:
//   No state, no JS needed. The page renders once via SSR/SSG; once
//   the network returns the user can manually click the retry button
//   (we use a tiny client island `OfflineRetryButton` for that
//   because window.location.reload requires the DOM).
//
// SEO:
//   This page exists at /:locale/offline and CAN be discovered by
//   search engines. We add `noindex` via metadata so it never appears
//   in SERPs — there's no informational value for non-PWA users.
//
// References:
//   - https://web.dev/articles/offline-cookbook
//   - https://nextjs.org/docs/app/api-reference/file-conventions/metadata
// ═══════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';

import { PageShell } from '@/components/layout';
import { NetworkIllustration } from '@/components/error';

import { OfflineRetryButton } from './offline-retry-button';

// ─── Metadata — no-index, no-follow ───────────────────────────

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

// ─── Page ─────────────────────────────────────────────────────

type Props = { params: Promise<{ locale: string }> };

export default async function OfflinePage({ params }: Props): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  return <OfflineInner />;
}

/**
 * Inner component — separated so we can call `useTranslations` (a
 * Client/Server hook from next-intl that needs the locale on the
 * request context already set via `setRequestLocale`).
 */
function OfflineInner(): React.ReactElement {
  const t = useTranslations('errors.offline');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6">
      <PageShell maxWidth="md" className="text-center">
        {/* ── Status pill ── */}
        <p className="inline-block rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-amber-700 uppercase dark:text-amber-300">
          {t('badge')}
        </p>

        {/* ── Illustration ── */}
        <div className="mt-6 flex justify-center">
          <NetworkIllustration className="size-20 text-muted-foreground sm:size-24" />
        </div>

        {/* ── Headline + description ── */}
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('description')}
        </p>

        {/* ── Tips list ── */}
        <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{t('tipWifi')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{t('tipAirplane')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{t('tipMobile')}</span>
          </li>
        </ul>

        {/* ── Primary CTA ── */}
        <div className="mt-8">
          <OfflineRetryButton label={t('retryLabel')} />
        </div>
      </PageShell>
    </main>
  );
}
