// apps/web/lib/errors/recovery.ts
// ═══════════════════════════════════════════════════════════════
// ERROR RECOVERY STRATEGIES — Task #52 Phase 1 (Foundation)
//
// Pure, deterministic mappers from `ErrorCategory` → recovery
// strategy. Used by:
//   - Error boundary components to decide which CTA to render
//     ("Try again" vs "Reload" vs "Sign in again")
//   - The retry hook (use-error-recovery) to time exponential backoff
//   - Audit logging to record the recovery action attempted
//
// Why mapping (not embedded UI logic):
//   - One source of truth — backend can read the same shape via the
//     audit log to understand client-side recovery patterns at scale.
//   - Locale-agnostic — copy lives in `messages/*/errors.json`,
//     keyed off `intentKey`. Components do `t(strategy.intentKey)`.
//   - Testable in isolation — pure functions; no React, no DOM.
//
// FAANG-grade exponential backoff:
//   - Base 500ms, ×2 per attempt, capped at 30s
//   - Full jitter (random 0–delay) — avoids thundering herd when many
//     clients retry simultaneously after an upstream recovery
//   - Reference: AWS Architecture Blog, "Exponential Backoff And Jitter"
//                Marc Brooker, 2015
//
// SSR-safe: zero browser globals, zero React.
// ═══════════════════════════════════════════════════════════════

import type { ErrorCategory } from './categorize';

// ─── Recovery action vocabulary ────────────────────────────────

/**
 * The complete set of recovery actions Datun UIs can offer. Each
 * maps to a specific button behaviour in error boundary components.
 *
 *   - 'retry'           — Call `unstable_retry()` (Next.js 16.2+) or
 *                          `queryClient.resetQueries()`; safe for
 *                          read-side failures.
 *   - 'reload'          — `window.location.reload()`. Required when
 *                          the JS bundle itself is broken (chunk-load).
 *   - 'navigate-home'   — Push to `/` (or locale root). Used when the
 *                          requested resource genuinely doesn't exist.
 *   - 'reauthenticate'  — Redirect to `/login?next=<current>`. Auth
 *                          recovery; sessions can't be silently retried.
 *   - 'wait-and-retry'  — Surface a countdown; auto-retry after delay.
 *                          Used for rate-limit (429) — respects server
 *                          back-pressure.
 *   - 'contact-support' — Fatal error; surface "Get help" CTA with
 *                          incident ID. No automatic remediation.
 */
export type RecoveryAction =
  | 'retry'
  | 'reload'
  | 'navigate-home'
  | 'reauthenticate'
  | 'wait-and-retry'
  | 'contact-support';

/**
 * The complete strategy returned for a categorised error. Components
 * pattern-match on `action` and render the corresponding CTA. Copy is
 * looked up via `intentKey` against next-intl's `errors.recovery.*`
 * namespace, so labels stay locale-aware.
 */
export interface RecoveryStrategy {
  /** Primary action the UI should offer. */
  readonly action: RecoveryAction;
  /**
   * Suggested wait time for `wait-and-retry` (seconds).
   * `undefined` for actions that don't gate on time.
   */
  readonly waitSeconds: number | undefined;
  /**
   * Cap on automated retries before promoting to the next strategy
   * (typically `contact-support`). `undefined` for non-retry actions.
   */
  readonly maxRetries: number | undefined;
  /**
   * Locale key for the user-facing intent string. Components do
   * `t(strategy.intentKey)` with `useTranslations('errors.recovery')`.
   */
  readonly intentKey: string;
  /**
   * If true, the UI should ALSO surface a secondary "Go home" link
   * alongside the primary action — applies to widget-level errors that
   * may leave the user stuck on a feature page.
   */
  readonly offerHomeAsFallback: boolean;
}

// ─── Backoff configuration ─────────────────────────────────────

/**
 * Tunables for `computeBackoffMs()`. Sensible defaults match the
 * TanStack Query client (`apps/web/lib/query/query-client.ts`) so
 * retries don't double-up between layers.
 */
export interface BackoffOptions {
  /** First retry delay before any multiplier, in ms. Default 500. */
  readonly baseDelayMs?: number;
  /** Hard cap on a single delay, in ms. Default 30 000 (30 s). */
  readonly maxDelayMs?: number;
  /**
   * Apply random jitter between 0 and the computed delay. Default
   * true — strongly recommended for distributed retries.
   */
  readonly jitter?: boolean;
  /** Pseudo-random source — injectable for deterministic tests. */
  readonly random?: () => number;
}

const DEFAULT_BACKOFF: Required<Omit<BackoffOptions, 'random'>> = {
  baseDelayMs: 500,
  maxDelayMs: 30_000,
  jitter: true,
};

/**
 * Compute the delay (in milliseconds) before the next retry.
 *
 * Algorithm: `min(maxDelay, baseDelay × 2^attempt)` then optionally
 * apply full jitter — `random() × delay`. Attempt index is 0-based
 * (first retry uses attempt=0).
 *
 * @example
 *   computeBackoffMs(0) // ≈ 0–500ms
 *   computeBackoffMs(1) // ≈ 0–1000ms
 *   computeBackoffMs(5) // ≈ 0–16000ms
 *   computeBackoffMs(10) // capped to ≈ 0–30000ms
 */
export function computeBackoffMs(attempt: number, options: BackoffOptions = {}): number {
  const {
    baseDelayMs = DEFAULT_BACKOFF.baseDelayMs,
    maxDelayMs = DEFAULT_BACKOFF.maxDelayMs,
    jitter = DEFAULT_BACKOFF.jitter,
    random,
  } = options;

  if (attempt < 0 || !Number.isFinite(attempt)) {
    throw new TypeError(
      `computeBackoffMs: attempt must be a non-negative finite number; got ${attempt}`,
    );
  }

  // 2^attempt grows fast — cap before the multiplication to avoid
  // floating-point edge cases at very high attempt counts.
  const cappedExponent = Math.min(attempt, 20); // 2^20 ≈ 1M, well past maxDelay
  const exponential = baseDelayMs * 2 ** cappedExponent;
  const capped = Math.min(exponential, maxDelayMs);

  if (!jitter) return Math.floor(capped);

  // Full jitter: random in [0, capped). Math.random() by default; an
  // injectable RNG keeps tests deterministic.
  const rng = random ?? Math.random;
  return Math.floor(rng() * capped);
}

// ─── Strategy mapping ──────────────────────────────────────────

/**
 * Map each error category to its recommended recovery strategy.
 *
 * Mappings are deliberate — every choice here is a UX decision:
 *
 *   - network          → retry (3×). Indian rural networks reconnect;
 *                         transient drops should self-heal.
 *   - auth             → reauthenticate. Refreshing the page would
 *                         loop through the same 401 — only re-login
 *                         can fix this.
 *   - validation       → contact-support. UI rejected the user's
 *                         input; the boundary is the wrong layer to
 *                         "retry". Validation errors should be caught
 *                         INLINE by form components — when one reaches
 *                         a boundary, something is structurally off.
 *   - rate-limit       → wait-and-retry, 30 s. Respect server
 *                         back-pressure rather than hammering.
 *   - not-found        → navigate-home. The resource is gone; staying
 *                         on the URL is dead-end.
 *   - server (5xx)     → retry (3×). Most transient outages recover
 *                         within seconds; modest retry budget.
 *   - ai-service       → retry (2×) then contact-support. AI provider
 *                         failover (Claude → OpenAI → Gemini) is owned
 *                         server-side; client-side retries are
 *                         cheap insurance.
 *   - consultation-state → contact-support. The session is unrecoverable;
 *                          the user needs to start a new consultation,
 *                          but the boundary shouldn't make that decision.
 *   - chunk-load       → reload. Bundle is genuinely missing. Cache-
 *                         busting reload is the ONLY fix.
 *   - unknown          → retry (3×) then contact-support. Conservative.
 */
export function getRecoveryStrategy(category: ErrorCategory): RecoveryStrategy {
  switch (category) {
    case 'network':
      return {
        action: 'retry',
        waitSeconds: undefined,
        maxRetries: 3,
        intentKey: 'recoveryNetwork',
        offerHomeAsFallback: true,
      };

    case 'auth':
      return {
        action: 'reauthenticate',
        waitSeconds: undefined,
        maxRetries: undefined,
        intentKey: 'recoveryAuth',
        offerHomeAsFallback: false,
      };

    case 'validation':
      return {
        action: 'contact-support',
        waitSeconds: undefined,
        maxRetries: undefined,
        intentKey: 'recoveryValidation',
        offerHomeAsFallback: true,
      };

    case 'rate-limit':
      return {
        action: 'wait-and-retry',
        waitSeconds: 30,
        maxRetries: 2,
        intentKey: 'recoveryRateLimit',
        offerHomeAsFallback: true,
      };

    case 'not-found':
      return {
        action: 'navigate-home',
        waitSeconds: undefined,
        maxRetries: undefined,
        intentKey: 'recoveryNotFound',
        offerHomeAsFallback: false,
      };

    case 'server':
      return {
        action: 'retry',
        waitSeconds: undefined,
        maxRetries: 3,
        intentKey: 'recoveryServer',
        offerHomeAsFallback: true,
      };

    case 'ai-service':
      return {
        action: 'retry',
        waitSeconds: undefined,
        maxRetries: 2,
        intentKey: 'recoveryAiService',
        offerHomeAsFallback: true,
      };

    case 'consultation-state':
      return {
        action: 'navigate-home',
        waitSeconds: undefined,
        maxRetries: undefined,
        intentKey: 'recoveryConsultationState',
        offerHomeAsFallback: false,
      };

    case 'chunk-load':
      return {
        action: 'reload',
        waitSeconds: undefined,
        maxRetries: undefined,
        intentKey: 'recoveryChunkLoad',
        offerHomeAsFallback: false,
      };

    case 'unknown':
      return {
        action: 'retry',
        waitSeconds: undefined,
        maxRetries: 3,
        intentKey: 'recoveryUnknown',
        offerHomeAsFallback: true,
      };

    // ── Exhaustiveness — compile fails if a new category is added ──
    default: {
      const _exhaustive: never = category;
      void _exhaustive;
      // Unreachable at runtime under sound typing; defensive fallback.
      return {
        action: 'contact-support',
        waitSeconds: undefined,
        maxRetries: undefined,
        intentKey: 'recoveryUnknown',
        offerHomeAsFallback: true,
      };
    }
  }
}
