// apps/web/components/error/retry-button.tsx
// ═══════════════════════════════════════════════════════════════
// RETRY BUTTON — Countdown-aware retry CTA (Task #52 Phase 2)
//
// A drop-in primitive that error fallbacks use as their "Try again"
// CTA. Wraps the Phase 1 `useErrorRecovery` hook so every retry
// across Datun uses the same:
//
//   - Exponential backoff with jitter
//   - Live countdown text during the backoff window
//   - Spinner indicator while in flight
//   - Exhaustion handling (button disables after maxRetries)
//   - Audit-log retryCount tracking
//
// Behaviour-driven design:
//
//   IDLE                — Button enabled, label "Try again" (i18n)
//   BACKOFF (delay > 0) — Button disabled, label "Retrying in 5s…"
//   IN-FLIGHT           — Button disabled, label "Retrying…"
//                          (after delay reaches 0, before completion)
//   EXHAUSTED           — Button disabled, label "Contact support"
//                          (clicks fall through to onExhausted prop)
//
// FIX (post-typecheck): `idleLabelKey` prop now uses a typed union of
// the actual i18n keys we want to permit. next-intl 4's `useTranslations`
// returns a strictly-typed `t()` function whose first arg is a literal
// union (`NamespacedMessageKeys<Messages, "errors">`), not raw `string`.
// Casting a `string` argument is rejected by TypeScript.
//
// References:
//   - https://www.nngroup.com/articles/progress-indicators/
//     (when to show progress vs spinner — backoff > 1s ⇒ countdown)
//   - WCAG 2.2 — 3.3.4 (Error suggestion)
//   - next-intl typed messages: https://next-intl.dev/docs/workflows/typescript
// ═══════════════════════════════════════════════════════════════

'use client';

import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useErrorRecovery } from '@/hooks/use-error-recovery';
import type { BackoffOptions } from '@/lib/errors';

// ─── Idle-label vocabulary ──────────────────────────────────────
//
// next-intl 4 generates a literal-union message-key type from the
// JSON files. The `useTranslations('errors')` returns a `t()` whose
// first argument must be a member of `NamespacedMessageKeys<...>`.
//
// We expose a small, finite set of valid idle labels the CALLER may
// pass through this prop. This keeps the surface area narrow (a
// fallback can't accidentally type-coerce some arbitrary key) and
// preserves the i18n type-safety on `t()`.
//
// Adding a new option here is intentional — review the locales first.
export type IdleLabelKey =
  | 'actions.retry'
  | 'actions.reload'
  | 'actions.signInAgain'
  | 'actions.getHelp';

// ─── Props ───────────────────────────────────────────────────

export interface RetryButtonProps {
  /**
   * Called by useErrorRecovery AFTER the backoff window expires.
   * Use this for caller-specific recovery work (re-running a
   * mutation, clearing a Zustand slice). Receives no arguments.
   * May return a promise — the hook awaits it.
   */
  readonly onRetry?: () => void | Promise<void>;
  /**
   * Resets the boundary's error state. Typically the `resetBoundary`
   * function from ErrorBoundaryFallbackProps. Called last, AFTER
   * onRetry + queryClient.resetQueries.
   */
  readonly resetBoundary?: () => void;
  /**
   * Called when the button is clicked AFTER maxRetries has been hit.
   * Useful for opening a support modal or navigating to /help.
   */
  readonly onExhausted?: () => void;
  /** Max retries before the button enters EXHAUSTED state. Default 3. */
  readonly maxRetries?: number;
  /** Backoff tuning. Defaults match TanStack Query (500ms base, 30s cap). */
  readonly backoff?: BackoffOptions;
  /**
   * Visual variant. Defaults to the primary button. Pass 'outline' for
   * secondary placement (e.g., alongside a "Go home" link).
   */
  readonly variant?: 'default' | 'outline' | 'ghost';
  /** Size variant of the underlying Button component. */
  readonly size?: 'default' | 'sm' | 'lg';
  /** Optional className for outer button. */
  readonly className?: string;
  /**
   * Locale key for the IDLE label. Default 'actions.retry'. Constrained
   * to a finite union so next-intl's typed `t()` accepts the value.
   * Override for category-specific copy (e.g. 'actions.reload' when
   * the category is 'chunk-load').
   */
  readonly idleLabelKey?: IdleLabelKey;
}

// ─── Component ───────────────────────────────────────────────

/**
 * Format the countdown for the BACKOFF state. Rounds UP so a freshly
 * computed delay never reads "0s" — that would look like a stuck
 * button. Uses Intl.NumberFormat for locale-aware integer rendering.
 */
function formatCountdown(ms: number, locale: string): string {
  const seconds = Math.max(1, Math.ceil(ms / 1000));
  try {
    return new Intl.NumberFormat(locale).format(seconds);
  } catch {
    return String(seconds);
  }
}

export function RetryButton({
  onRetry,
  resetBoundary,
  onExhausted,
  maxRetries,
  backoff,
  variant = 'default',
  size = 'default',
  className,
  idleLabelKey,
}: RetryButtonProps): React.ReactElement {
  const t = useTranslations('errors');

  const { retry, retryCount, exhausted, isRetrying, msUntilNextRetry } = useErrorRecovery({
    maxRetries,
    backoff,
    onRetry,
    resetBoundary,
  });

  const handleClick = (): void => {
    if (exhausted) {
      onExhausted?.();
      return;
    }
    retry();
  };

  // ── Locale for Intl.NumberFormat — read via DOM (avoid hooks order issues) ──
  const locale = typeof document !== 'undefined' ? document.documentElement.lang || 'en' : 'en';

  // ── Derive button state, label, and icon ──
  let label: string;
  let icon: React.ReactNode;
  let disabled = false;

  if (exhausted) {
    label = t('actions.contactSupport');
    icon = <AlertCircle aria-hidden />;
  } else if (isRetrying && msUntilNextRetry > 0) {
    label = t('actions.retryingIn', { seconds: formatCountdown(msUntilNextRetry, locale) });
    icon = <RefreshCw aria-hidden className="animate-spin" />;
    disabled = true;
  } else if (isRetrying) {
    label = t('actions.retrying');
    icon = <RefreshCw aria-hidden className="animate-spin" />;
    disabled = true;
  } else {
    // idleLabelKey is now a typed union — next-intl's t() accepts it directly.
    const key: IdleLabelKey = idleLabelKey ?? 'actions.retry';
    label = t(key);
    icon = <RefreshCw aria-hidden />;
  }

  // ── ARIA live region — assertively announce state changes ──
  // The button's text already updates; an aria-live container on the
  // SAME element is appropriate per WAI-ARIA Authoring Practices.
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled}
      aria-live="polite"
      aria-busy={isRetrying}
      data-retry-count={retryCount}
      data-retry-exhausted={exhausted ? 'true' : 'false'}
      className={cn(className)}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}
