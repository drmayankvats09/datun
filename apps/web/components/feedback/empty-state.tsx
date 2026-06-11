'use client';

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE — "No data" surface, designed as an opportunity
// to guide the user toward their next action.
//
// FAANG PATTERN
// ─────────────
// Empty ≠ blank. Linear, Stripe, Notion, Vercel, and Arc each
// treat empty states as the single highest-leverage activation
// moment in the user journey. Brian Chesky framed it best:
// "empty states are the first impression for 80% of users."
//
// Datun ships two consumption modes on top of the same renderer:
//
//   1. VARIANT MODE (preferred for built-in surfaces)
//      <EmptyState variant="noConsultations" />
//      → resolves icon, copy, CTA, and tone from
//        empty-state-registry.ts via next-intl translations.
//      → 100% i18n-ready, translator-friendly, registry-validated.
//
//   2. MANUAL MODE (escape hatch — backward compatible)
//      <EmptyState icon="📭" title="…" description="…" />
//      → preserves the original Task #50-era API so existing
//        callers continue to work without edits.
//
// MOTION (Task #50 contract)
// ──────────────────────────
//   • Reads `useMotionLevel().isReduced` and renders a plain
//     <div> when the user, OS, or network indicates a preference
//     against animation.
//   • Otherwise wraps the body in a Framer Motion <m.div>
//     that fades + slides in over `DURATION.moderate` with
//     `EASE.smoothOut` — matches the motion language Linear and
//     Stripe ship in 2026.
//
// ACCESSIBILITY
// ─────────────
//   • role="status" — announces the surface as a status region.
//   • aria-live="polite" — screen reader narrates the headline
//     once, without interrupting other speech.
//   • Decorative icons carry aria-hidden so they do not pollute
//     the announcement.
//
// COPY DISCIPLINE (Memory rule #19)
// ─────────────────────────────────
// All variant-mode copy is FAANG-grade professional English
// benchmarked against 2026 Linear/Stripe/Notion/Vercel patterns.
// Manual-mode copy is the caller's responsibility — but the rule
// still applies.
//
// Task #51 — Loading skeletons + empty states everywhere.
// Refactor of the Task #50 EmptyState.
// ═══════════════════════════════════════════════════════════════

import type { ComponentType } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { LucideIcon } from 'lucide-react';

import { DISTANCE, DURATION, EASE } from '@repo/shared';
import { useMotionLevel } from '@/hooks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import {
  EMPTY_STATE_REGISTRY,
  type EmptyStateDescriptor,
  type EmptyStateTone,
  type EmptyStateVariant,
} from './empty-state-registry';

// ─────────────────────────────────────────────────────────────────
// PROP CONTRACTS
// ─────────────────────────────────────────────────────────────────

/**
 * Variant mode — preferred. Reads everything from the registry.
 *
 * Override `actionHref` or `onAction` when the destination is
 * dynamic (e.g. needs a tenant slug). Override `className` to nudge
 * spacing inside a container; do not override colors — those follow
 * the variant's tone.
 */
interface VariantModeProps {
  /** Registry key — see `EmptyStateVariant`. */
  variant: EmptyStateVariant;
  /** Optional override for the registry's `actionHref`. */
  actionHref?: string;
  /** Optional click handler — used in place of an `<a>`-style CTA. */
  onAction?: () => void;
  /** Extra Tailwind classes appended to the outer wrapper. */
  className?: string;
}

/**
 * Manual mode — escape hatch. Backward compatible with the
 * original Task #50-era API, plus a couple of additive niceties
 * (Lucide icon support, tone override).
 *
 * Use only when the registry does not (yet) contain a variant for
 * this surface. If you find yourself reaching for manual mode more
 * than once, the right move is usually to add a registry entry.
 */
interface ManualModeProps {
  /** Sentinel so the discriminated union narrows correctly. */
  variant?: undefined;

  /**
   * Either a Lucide icon component (preferred) or a string emoji
   * (legacy). Strings render at `text-3xl`; Lucide icons render at
   * `h-8 w-8` colored via the active tone.
   */
  icon?: LucideIcon | string;

  /** Primary heading. Single line, sentence case. */
  title: string;

  /** Supporting paragraph. One to two sentences. */
  description: string;

  /** Optional CTA label. Renders a button when paired with a target. */
  actionLabel?: string;

  /** Optional CTA href — renders an `<a>` styled as a button. */
  actionHref?: string;

  /** Optional CTA click handler — used when there is no href. */
  onAction?: () => void;

  /** Visual tone. Defaults to `neutral`. */
  tone?: EmptyStateTone;

  /** Extra Tailwind classes appended to the outer wrapper. */
  className?: string;
}

/**
 * The component accepts either a variant prop or the full manual
 * shape. TypeScript narrows correctly at the call site.
 */
export type EmptyStateProps = VariantModeProps | ManualModeProps;

// ─────────────────────────────────────────────────────────────────
// TONE → CLASSES MAP
// ─────────────────────────────────────────────────────────────────
//
// Tones map to icon-tile styling. We keep colors as direct Tailwind
// utilities (rather than CSS variables) because:
//   • Tailwind v4 includes the full emerald/amber palettes by default.
//   • The shadcn `destructive` token already exists and is reused.
//   • Both light and dark themes get explicit, intentional shades —
//     no surprise when the user toggles theme.
//
// If we later introduce semantic tokens for success/warning in the
// shared design tokens package, swap these maps without touching
// any caller — that is the entire point of centralising tones here.

const TONE_CLASSES: Record<EmptyStateTone, { tileBg: string; iconColor: string }> = {
  neutral: {
    tileBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
  },
  positive: {
    tileBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    tileBg: 'bg-amber-50 dark:bg-amber-950/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  restrictive: {
    tileBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
  },
};

// ─────────────────────────────────────────────────────────────────
// PUBLIC ENTRY POINT
// ─────────────────────────────────────────────────────────────────

/**
 * Renders the appropriate "no data" surface. Branches between
 * variant mode (registry-driven) and manual mode (props-driven)
 * based on which prop shape the caller supplies.
 *
 * @example Variant mode (preferred)
 *   <EmptyState variant="noConsultations" />
 *
 * @example Manual mode (legacy / one-off)
 *   <EmptyState
 *     icon="📭"
 *     title={t('page.noItems')}
 *     description=""
 *     actionLabel={t('page.refresh')}
 *     onAction={handleRefresh}
 *   />
 */
export function EmptyState(props: EmptyStateProps) {
  // Variant mode dispatches through a small intermediate component
  // so that `useTranslations` is only called when a variant is in
  // play — manual mode does not need next-intl context.
  if (props.variant !== undefined) {
    return <EmptyStateFromVariant {...props} />;
  }

  return (
    <EmptyStateRenderer
      icon={props.icon ?? '📭'}
      title={props.title}
      description={props.description}
      actionLabel={props.actionLabel}
      actionHref={props.actionHref}
      onAction={props.onAction}
      tone={props.tone ?? 'neutral'}
      className={props.className}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// VARIANT-MODE WRAPPER
// ─────────────────────────────────────────────────────────────────

/**
 * Resolves a registry descriptor, looks up its translated strings,
 * and forwards everything to the renderer.
 *
 * Lives as a separate component (not an inline branch) so that the
 * `useTranslations` hook call sits at the top of a stable component
 * — React's rules of hooks are respected, and the renderer remains
 * a pure consumer of resolved strings.
 */
function EmptyStateFromVariant({ variant, actionHref, onAction, className }: VariantModeProps) {
  const t = useTranslations();
  const descriptor: EmptyStateDescriptor = EMPTY_STATE_REGISTRY[variant];

  // The registry stores key paths as `string`, while next-intl's
  // `t()` is strictly typed to the auto-generated message tree.
  // Cast through `Parameters<typeof t>[0]` so the dynamic key
  // resolves at runtime without weakening the rest of the API.
  type TKey = Parameters<typeof t>[0];

  return (
    <EmptyStateRenderer
      icon={descriptor.icon}
      title={t(descriptor.titleKey as TKey)}
      description={t(descriptor.descriptionKey as TKey)}
      actionLabel={descriptor.actionKey ? t(descriptor.actionKey as TKey) : undefined}
      actionHref={actionHref ?? descriptor.actionHref}
      onAction={onAction}
      tone={descriptor.tone}
      className={className}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// CORE RENDERER
// ─────────────────────────────────────────────────────────────────

/**
 * Resolved props consumed by the renderer. All translation work
 * and registry lookups happen above this layer — keeping the
 * renderer pure makes it trivially testable and snapshot-stable.
 */
interface EmptyStateRendererProps {
  icon: LucideIcon | string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  tone: EmptyStateTone;
  className?: string;
}

function EmptyStateRenderer({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  tone,
  className,
}: EmptyStateRendererProps) {
  const { isReduced } = useMotionLevel();
  const toneClasses = TONE_CLASSES[tone];

  const wrapperClasses = cn(
    'flex flex-col items-center justify-center px-6 py-16 text-center',
    className,
  );

  // The body is identical across the reduced-motion and animated
  // branches — extracted once so the two branches stay perfectly
  // in sync as the component evolves.
  const body = (
    <>
      <div
        className={cn(
          'mb-4 flex h-16 w-16 items-center justify-center rounded-2xl',
          toneClasses.tileBg,
        )}
      >
        <EmptyStateIcon icon={icon} colorClass={toneClasses.iconColor} />
      </div>

      <h3 className="text-lg font-semibold text-foreground">{title}</h3>

      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}

      {actionLabel && (actionHref || onAction) ? (
        <div className="mt-6">
          {actionHref ? (
            <Button asChild size="lg">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button onClick={onAction} size="lg">
              {actionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </>
  );

  if (isReduced) {
    return (
      <div className={wrapperClasses} role="status" aria-live="polite">
        {body}
      </div>
    );
  }

  return (
    <m.div
      className={wrapperClasses}
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: DISTANCE.sm }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.moderate, ease: EASE.smoothOut }}
    >
      {body}
    </m.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ICON RENDERER
// ─────────────────────────────────────────────────────────────────

/**
 * Renders either a Lucide icon (preferred) or a string emoji (legacy).
 *
 * Lucide icons inherit `currentColor`, so the wrapping tone-color
 * class flows through naturally. String emojis ignore color and
 * render at `text-3xl` to match the original Task #50 layout.
 *
 * Note: Lucide v1 exports icon components whose runtime shape is a
 * forward-ref `ComponentType`, so we accept it via the broader
 * `ComponentType<{ className?: string }>` type to remain version-tolerant.
 */
function EmptyStateIcon({ icon, colorClass }: { icon: LucideIcon | string; colorClass: string }) {
  if (typeof icon === 'string') {
    return (
      <span className="text-3xl" aria-hidden="true">
        {icon}
      </span>
    );
  }

  // `LucideIcon` is a `ComponentType<LucideProps>` — assignable here.
  const Icon = icon as ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  return <Icon className={cn('h-8 w-8', colorClass)} aria-hidden={true} />;
}
