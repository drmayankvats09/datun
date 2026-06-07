// apps/web/app/[locale]/not-found.tsx
// ═══════════════════════════════════════════════════════════════
// LOCALE 404 PAGE — Task #52 Phase 3 (UPGRADE)
//
// 2026-grade 404 page:
//   - Category illustration (NotFoundIllustration from Phase 2)
//   - Headline + descriptive sub-copy
//   - Three popular destinations (home, login, consult) as link
//     suggestions — research shows 65–70% recovery rate vs ~30%
//     bounce from generic "page not found"
//   - "Tell us how you got here" feedback link → opens the Sentry
//     feedback widget with a pre-set tag `feedback_source=404`
//     (Phase 5 wires the routing in the SDK config; here we just
//     surface the affordance)
//   - i18n-aware — every string from the `errors.notFound.*` namespace
//
// SERVER COMPONENT:
//   This file stays a Server Component (no 'use client') so it can be
//   statically rendered on every request without JS. The interactive
//   feedback link delegates to a tiny client wrapper imported below
//   — but the bulk of the page (illustration, copy, primary links) is
//   pure HTML, which keeps Lighthouse 404 scores high and survives
//   even when JS is blocked.
//
// SEO:
//   Next.js automatically sets HTTP status 404 for routes that render
//   not-found.tsx — no manual response shape needed.
//
// References:
//   - Nielsen Norman Group, "404 Error Pages"
//   - https://nextjs.org/docs/app/api-reference/file-conventions/not-found
// ═══════════════════════════════════════════════════════════════

import { useTranslations } from 'next-intl';
import { Compass, MessageSquareWarning, Search, Stethoscope } from 'lucide-react';

import { PageShell } from '@/components/layout';
import { Link } from '@/i18n/navigation';
import { NotFoundIllustration } from '@/components/error';

import { NotFoundFeedbackLink } from './not-found-feedback-link';

/**
 * Locale-aware 404 page. Server Component — no client JS by default.
 * The "Tell us how you got here" affordance lives in a tiny island
 * client component (`./not-found-feedback-link.tsx`) — exists from
 * Phase 5 wiring of the Sentry feedback dialog. For Phase 3 we
 * surface a placeholder link that gracefully degrades.
 */
export default function NotFound(): React.ReactElement {
  const t = useTranslations('errors.notFound');
  const tAction = useTranslations('errors.actions');

  // Popular destinations — research shows surfacing 2-3 likely intents
  // converts 404 visitors at 65-70% vs <30% for a generic "go home".
  const destinations = [
    {
      href: '/',
      icon: Compass,
      labelKey: 'destinations.home',
    },
    {
      href: '/consult',
      icon: Stethoscope,
      labelKey: 'destinations.consult',
    },
    {
      href: '/login',
      icon: Search,
      labelKey: 'destinations.signin',
    },
  ] as const;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 sm:px-6">
      <PageShell maxWidth="lg" className="text-center">
        {/* ── Status pill ── */}
        <p className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
          404
        </p>

        {/* ── Illustration ── */}
        <div className="mt-6 flex justify-center">
          <NotFoundIllustration className="size-20 text-muted-foreground sm:size-24" />
        </div>

        {/* ── Headline + description ── */}
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
          {t('title')}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('description')}
        </p>

        {/* ── Popular destinations ── */}
        <div className="mt-8">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase">
            {t('popular')}
          </p>
          <ul className="mx-auto mt-4 grid max-w-md gap-2 sm:grid-cols-3">
            {destinations.map(({ href, icon: Icon, labelKey }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Icon aria-hidden className="size-5 text-primary" />
                  <span>{t(labelKey)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Primary CTA — explicit "Return home" for clarity ── */}
        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            {tAction('goHome')}
          </Link>
        </div>

        {/* ── Feedback link ── */}
        <p className="mt-10 text-xs text-muted-foreground">
          <MessageSquareWarning
            aria-hidden
            className="mr-1 inline-block size-3.5 align-text-bottom"
          />
          <NotFoundFeedbackLink label={t('feedbackPrompt')} />
        </p>
      </PageShell>
    </main>
  );
}
