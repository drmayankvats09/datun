// apps/web/hooks/use-error-recovery.ts
// ═══════════════════════════════════════════════════════════════
// USE-ERROR-RECOVERY — Task #52 Phase 1 (Foundation)
//
// React hook that orchestrates the "Try again" experience inside
// error boundary fallbacks. Combines:
//
//   1. Retry counter with a configurable maximum (default 3)
//   2. Exponential backoff with full jitter (from lib/errors/recovery)
//   3. TanStack Query cache reset — so stale errored queries refetch
//      on the next render of the boundary's children
//   4. Optional caller-provided onRetry (custom recovery work)
//
// Why a hook (not inline in each boundary):
//   - Same retry semantics across widget / route / app boundaries —
//     consistency in user experience.
//   - Centralised place to update if FAANG retry science evolves
//     (e.g., switch from full jitter to equal jitter someday).
//   - Easy to instrument with audit-log calls from one location.
//
// Concurrency safety:
//   - A retry while another retry is in flight is a no-op — the second
//     click "absorbs" into the first without resetting the timer.
//   - On unmount, in-flight timers are cleared via the cleanup
//     function returned from useEffect.
//
// References:
//   - https://docs.aws.amazon.com/general/latest/gr/api-retries.html
//   - Marc Brooker, "Exponential Backoff And Jitter" (AWS Architecture)
//   - TanStack Query docs on `useQueryErrorResetBoundary`
// ═══════════════════════════════════════════════════════════════

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { computeBackoffMs, type BackoffOptions } from '@/lib/errors';

// ─── Public surface ────────────────────────────────────────────

/**
 * Configuration options for the recovery hook. All have sensible
 * defaults — the hook can be called with no arguments.
 */
export interface UseErrorRecoveryOptions {
  /** Maximum number of retries before `exhausted` flips true. Default 3. */
  readonly maxRetries?: number;
  /**
   * Backoff tuning. See `lib/errors/recovery.computeBackoffMs`.
   * Defaults: 500ms base, 30s cap, jitter on.
   */
  readonly backoff?: BackoffOptions;
  /**
   * Optional callback invoked when the retry is "committed" (after
   * the backoff delay, before resetting TanStack Query). Use this
   * for custom recovery work — e.g., re-calling a specific mutation,
   * clearing a corrupted Zustand slice.
   *
   * The callback may be async; the hook awaits it before completing.
   * If it throws, the retry is marked complete (no double-retry loop).
   */
  readonly onRetry?: () => void | Promise<void>;
  /**
   * Optional `reset` callback from Next.js's `error.tsx` props or
   * a custom class boundary's `setState`. Called AFTER `onRetry`
   * and AFTER `queryClient.resetQueries()` so the boundary unmounts
   * its fallback and the children re-render with fresh state.
   */
  readonly resetBoundary?: () => void;
}

/**
 * Return shape of the hook. UI components destructure and bind to
 * buttons / countdowns.
 */
export interface UseErrorRecoveryReturn {
  /** Trigger a retry. No-op when `isRetrying` or `exhausted`. */
  readonly retry: () => void;
  /** Number of retries that have started (0 before the first click). */
  readonly retryCount: number;
  /** True after `maxRetries` retries have been attempted. */
  readonly exhausted: boolean;
  /** True while a retry is in flight (during backoff or onRetry). */
  readonly isRetrying: boolean;
  /**
   * Milliseconds remaining in the current backoff, or 0 when idle.
   * Use this to render a countdown ("Retrying in 5s…").
   */
  readonly msUntilNextRetry: number;
}

// ─── Hook ──────────────────────────────────────────────────────

const DEFAULT_MAX_RETRIES = 3;

export function useErrorRecovery(options: UseErrorRecoveryOptions = {}): UseErrorRecoveryReturn {
  const { maxRetries = DEFAULT_MAX_RETRIES, backoff, onRetry, resetBoundary } = options;

  const queryClient = useQueryClient();

  // ── State ──
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [msUntilNextRetry, setMsUntilNextRetry] = useState(0);

  // ── Refs (stable across renders) ──
  const isMountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount — clears any in-flight timers to prevent
  // "setState after unmount" warnings + memory leaks.
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (countdownRef.current !== null) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, []);

  // Compute exhausted from retryCount — single source of truth.
  const exhausted = retryCount >= maxRetries;

  const retry = useCallback(() => {
    // Guard against double-click / repeated taps.
    if (isRetrying || exhausted) return;
    if (!isMountedRef.current) return;

    setIsRetrying(true);

    // Compute delay using the SAME backoff math as TanStack Query
    // and the audit log. Pass the current attempt INDEX (0-based).
    const delayMs = computeBackoffMs(retryCount, backoff);
    setMsUntilNextRetry(delayMs);

    // ── Countdown tick — updates `msUntilNextRetry` every ~100ms
    //    so UIs can render a smooth countdown. Clamped to >=0.
    const startedAt = Date.now();
    countdownRef.current = setInterval(() => {
      if (!isMountedRef.current) return;
      const remaining = Math.max(0, delayMs - (Date.now() - startedAt));
      setMsUntilNextRetry(remaining);
      if (remaining === 0 && countdownRef.current !== null) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }, 100);

    // ── Commit the retry after the backoff delay.
    timerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;

      // Stop the countdown if the timer fired exactly when the interval
      // was about to clear itself.
      if (countdownRef.current !== null) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }

      try {
        // Step 1 — caller-defined recovery work (mutations, slice resets).
        if (onRetry) {
          await onRetry();
        }
      } catch {
        // We deliberately swallow onRetry errors here. The boundary
        // is already showing an error UI; bubbling would trigger an
        // infinite loop with no user benefit. The thrown error is
        // captured by Sentry through the boundary's own captureException.
      }

      if (!isMountedRef.current) return;

      // Step 2 — clear ALL stale query caches in the closest
      //          QueryErrorResetBoundary scope. This is what tells
      //          useQuery to re-fetch when the children re-mount.
      try {
        await queryClient.resetQueries();
      } catch {
        // resetQueries shouldn't throw under normal conditions; if it
        // does (e.g., during a Suspense transition), proceed to
        // resetBoundary anyway.
      }

      if (!isMountedRef.current) return;

      // Step 3 — flip the boundary's error state OFF so children render.
      try {
        resetBoundary?.();
      } catch {
        // resetBoundary failures are extraordinarily rare; swallow to
        // keep the hook side-effect-free from the caller's POV.
      }

      if (!isMountedRef.current) return;

      // Final bookkeeping — bump the counter, mark idle, ready for next.
      setRetryCount((prev) => prev + 1);
      setIsRetrying(false);
      setMsUntilNextRetry(0);
      timerRef.current = null;
    }, delayMs);
  }, [isRetrying, exhausted, retryCount, backoff, onRetry, resetBoundary, queryClient]);

  return {
    retry,
    retryCount,
    exhausted,
    isRetrying,
    msUntilNextRetry,
  };
}
