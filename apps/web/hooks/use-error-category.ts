// apps/web/hooks/use-error-category.ts
// ═══════════════════════════════════════════════════════════════
// USE-ERROR-CATEGORY — Task #52 Phase 1 (Foundation)
//
// Thin React hook that memoises `categorize()` + `getRecoveryStrategy()`
// for a given error value. Error boundary fallbacks call this once per
// render to derive everything they need:
//
//   const { category, severity, isRetryable, strategy } =
//     useErrorCategory(error)
//
// Why memoisation matters here:
//   - `categorize()` is pure and cheap, but boundary fallbacks render
//     on EVERY parent re-render (think: countdown tick during retry
//     backoff). Recomputing the category each tick produces a fresh
//     object identity that breaks downstream `useMemo` / `React.memo`.
//   - Memoising by error REFERENCE is the correct invariant — an error
//     instance is immutable; recomputing for the same instance is waste.
//
// SSR: this hook is 'use client' (it imports React hooks). Boundaries
// that need server-side categorisation should import the raw
// `categorize()` function from `@/lib/errors` instead.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useMemo } from 'react';
import {
  categorize,
  getRecoveryStrategy,
  type CategorizedError,
  type RecoveryStrategy,
} from '@/lib/errors';

// ─── Public shape ──────────────────────────────────────────────

/**
 * The fully-resolved view of an error — category metadata plus the
 * recovery strategy mapped from that category. Components destructure
 * what they need.
 */
export interface UseErrorCategoryReturn extends CategorizedError {
  /** Recovery strategy derived from the category. */
  readonly strategy: RecoveryStrategy;
}

// ─── Hook ──────────────────────────────────────────────────────

/**
 * Memoise `categorize(error)` and the matching recovery strategy.
 * Recomputes ONLY when the `error` reference changes — typically once
 * per boundary lifetime.
 *
 * @example
 *   function ErrorFallback({ error }: { error: unknown }) {
 *     const { category, severity, strategy } = useErrorCategory(error)
 *     return (
 *       <RouteError
 *         category={category}
 *         severity={severity}
 *         action={strategy.action}
 *         intentKey={strategy.intentKey}
 *       />
 *     )
 *   }
 */
export function useErrorCategory(error: unknown): UseErrorCategoryReturn {
  return useMemo(() => {
    const categorised = categorize(error);
    const strategy = getRecoveryStrategy(categorised.category);
    return { ...categorised, strategy };
  }, [error]);
}
