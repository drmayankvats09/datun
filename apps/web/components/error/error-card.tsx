// apps/web/components/error/error-card.tsx
// ═══════════════════════════════════════════════════════════════
// ERROR CARD — Shared visual primitive (Task #52 Phase 2)
//
// The visual shell every error UI in Datun shares:
//
//   ┌─────────────────────────────────────────┐
//   │                                          │
//   │           [Illustration]                │
//   │                                          │
//   │           Headline                      │
//   │           Body copy                     │
//   │                                          │
//   │      [Primary CTA] [Secondary CTA]      │
//   │                                          │
//   │      Footer (incident ID, link)         │
//   │                                          │
//   └─────────────────────────────────────────┘
//
// Three size variants:
//   - 'compact'  — inline widget; ~120px tall; centred
//   - 'page'     — route-level; ~50vh tall; vertical centred
//   - 'fullscreen' — app-level; takes the whole viewport
//
// All copy is passed in as props — the card is locale-agnostic.
// Consumers (WidgetError / RouteError / AppError) pre-translate
// via next-intl and forward strings here.
//
// References:
//   - Linear's error state design
//   - Stripe Docs error illustrations
//   - WCAG 2.2 — 1.4.3 Contrast, 2.4.7 Focus Visible
// ═══════════════════════════════════════════════════════════════

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// ─── Public types ──────────────────────────────────────────────

/**
 * Visual size of the card. Determines spacing, max-width, and
 * illustration size — but NOT the underlying layout flow. Consumers
 * still control their own positioning (e.g., wrapping in PageShell).
 */
export type ErrorCardSize = 'compact' | 'page' | 'fullscreen';

export interface ErrorCardProps {
  /** Layout size variant. */
  readonly size?: ErrorCardSize;
  /**
   * Illustration node (typically from `error-illustrations.tsx`).
   * Pass as JSX so the consumer can size + colour it.
   */
  readonly illustration?: React.ReactNode;
  /** Localised headline (h1 for `page`/`fullscreen`, h2 for `compact`). */
  readonly title: string;
  /** Localised body copy. May contain plain text only — no JSX. */
  readonly description: string;
  /** Primary CTA — usually <RetryButton /> or a Link wrapped in Button. */
  readonly primaryAction?: React.ReactNode;
  /** Secondary CTA — usually "Go home" or "Sign in again". */
  readonly secondaryAction?: React.ReactNode;
  /**
   * Pre-localised string for the optional footer note (e.g., "Reference:
   * <code>{eventId}</code>" or "Need help? Contact support"). Wrapped
   * in muted text below the actions. Accepts ReactNode to allow inline
   * links or <code> styling at the call site.
   */
  readonly footer?: React.ReactNode;
  /**
   * Additional className to merge with the variant's base classes.
   * Useful for one-off spacing tweaks at the consumption site.
   */
  readonly className?: string;
  /**
   * ARIA role override. Defaults to 'alert' — appropriate when the
   * error is unexpected (boundary catch). Set to 'region' for
   * expected-but-empty states (e.g., a list returning zero items).
   */
  readonly role?: 'alert' | 'region' | 'status';
}

// ─── Internal layout configuration ─────────────────────────────

interface SizeConfig {
  readonly outer: string;
  readonly inner: string;
  readonly illustrationSize: string;
  readonly title: string;
  readonly description: string;
  readonly actions: string;
}

const SIZE_CLASSES: Readonly<Record<ErrorCardSize, SizeConfig>> = {
  compact: {
    outer: 'flex flex-col items-center justify-center px-4 py-8',
    inner: 'flex max-w-sm flex-col items-center gap-3 text-center',
    illustrationSize: 'size-10 text-muted-foreground',
    title: 'text-base font-semibold text-foreground',
    description: 'text-sm text-muted-foreground',
    actions: 'mt-2 flex flex-wrap items-center justify-center gap-2',
  },
  page: {
    outer: 'flex min-h-[50vh] flex-col items-center justify-center px-4 py-12 sm:px-6',
    inner: 'flex max-w-md flex-col items-center gap-4 text-center',
    illustrationSize: 'size-16 text-muted-foreground sm:size-20',
    title: 'text-xl font-bold tracking-tight text-foreground sm:text-2xl',
    description: 'text-sm text-muted-foreground sm:text-base',
    actions: 'mt-2 flex flex-wrap items-center justify-center gap-3',
  },
  fullscreen: {
    outer: 'flex min-h-screen flex-col items-center justify-center px-6 py-12',
    inner: 'flex max-w-md flex-col items-center gap-5 text-center',
    illustrationSize: 'size-20 text-muted-foreground sm:size-24',
    title: 'text-2xl font-bold tracking-tight text-foreground sm:text-3xl',
    description: 'text-sm text-muted-foreground sm:text-base',
    actions: 'mt-2 flex flex-wrap items-center justify-center gap-3',
  },
};

// ─── Component ─────────────────────────────────────────────────

/**
 * Visual shell for every error UI in Datun. Locale-agnostic — pass
 * pre-translated strings.
 *
 * @example  (compact widget)
 *   <ErrorCard
 *     size="compact"
 *     illustration={<NetworkIllustration />}
 *     title="Connection lost"
 *     description="Check your internet and try again."
 *     primaryAction={<RetryButton resetBoundary={resetBoundary} />}
 *   />
 *
 * @example  (full route)
 *   <ErrorCard
 *     size="page"
 *     illustration={<ServerIllustration className="size-20" />}
 *     title={t('category.server.title')}
 *     description={t('category.server.message')}
 *     primaryAction={<RetryButton resetBoundary={reset} />}
 *     secondaryAction={
 *       <Button asChild variant="outline">
 *         <Link href="/">{t('actions.goHome')}</Link>
 *       </Button>
 *     }
 *     footer={
 *       <p>
 *         {t('reference')}: <code>{eventId}</code>
 *       </p>
 *     }
 *   />
 */
export function ErrorCard({
  size = 'page',
  illustration,
  title,
  description,
  primaryAction,
  secondaryAction,
  footer,
  className,
  role = 'alert',
}: ErrorCardProps): React.ReactElement {
  const config = SIZE_CLASSES[size];
  const titleTag = size === 'compact' ? 'h2' : 'h1';
  const TitleTag = titleTag as keyof React.JSX.IntrinsicElements;

  // Clone the illustration with the size-config className merged. We
  // do this with React.cloneElement so consumers can pass arbitrary
  // SVG / image elements without each needing to know our sizing
  // convention. Skip cloning when the consumer passes something other
  // than a single element (string, number, fragment, etc.).
  const sizedIllustration = React.isValidElement(illustration)
    ? React.cloneElement(illustration as React.ReactElement<{ className?: string }>, {
        className: cn(
          (illustration as React.ReactElement<{ className?: string }>).props.className,
          config.illustrationSize,
        ),
      })
    : illustration;

  return (
    <div
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      className={cn(config.outer, className)}
    >
      <div className={config.inner}>
        {sizedIllustration ? <div className="shrink-0">{sizedIllustration}</div> : null}

        <TitleTag className={config.title}>{title}</TitleTag>
        <p className={config.description}>{description}</p>

        {(primaryAction || secondaryAction) && (
          <div className={config.actions}>
            {primaryAction}
            {secondaryAction}
          </div>
        )}

        {footer ? <div className="mt-2 text-xs text-muted-foreground">{footer}</div> : null}
      </div>
    </div>
  );
}
