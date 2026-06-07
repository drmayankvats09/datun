// apps/web/components/a11y/error-boundary.tsx
// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY — React crash recovery (UPGRADED — Task #52 Phase 2)
//
// THE ONE class component in Datun's frontend. React 19 hooks still
// cannot catch render-phase throws — class boundaries remain the
// only mechanism for that, and `componentDidCatch` runs at the
// commit phase, AFTER the throw, so we can ship to Sentry + audit
// log even when descendant components are partially mounted.
//
// What's NEW vs the original v1 boundary:
//   - Categorises every catch via @/lib/errors (Phase 1)
//   - Re-throws Next.js control-flow throws (redirect/notFound/etc.)
//     so framework navigation continues to work
//   - Reports to Sentry with `error.category` and `boundary.level`
//     tags for fast triage in the dashboard
//   - Ships an audit-log entry to /api/audit/error (DPDP evidence)
//   - Accepts a fallback as ReactNode OR render-prop — the
//     render-prop variant receives `{error, errorInfo, resetBoundary,
//     eventId}` and unlocks rich, category-aware UIs
//   - `resetKeys` array — if any key changes the boundary auto-resets,
//     mirroring react-error-boundary's API (deprecated in favour of
//     this internal one to avoid the extra dependency)
//   - `onError` / `onReset` callbacks for instrumentation hooks
//
// Backward compatibility:
//   `<ErrorBoundary>{children}</ErrorBoundary>` continues to work
//   exactly as before — `level` defaults to 'widget', `fallback`
//   accepts the same ReactNode it always did. The app-provider
//   import `import { ErrorBoundary } from '@/components/a11y'` is
//   unchanged.
//
// Why this file lives in `components/a11y` (not `components/error`):
//   - Preserves the existing app-provider import path. Moving it
//     would require a churn-heavy commit touching every consumer.
//   - The boundary IS an a11y concern (it keeps focus on the page
//     rather than dumping the user into a white screen).
//   - All NEW error components live under `components/error/*`;
//     this is the only legacy-location file in Phase 2.
//
// References:
//   - https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
//   - https://docs.sentry.io/platforms/javascript/guides/nextjs/usage/
//   - Kent C. Dodds, "Use react-error-boundary to handle errors in React"
// ═══════════════════════════════════════════════════════════════

'use client';

import React from 'react';
import * as Sentry from '@sentry/nextjs';

import {
  categorize,
  isFrameworkControlFlow,
  logErrorToAudit,
  getAuditSessionId,
  type CategorizedError,
} from '@/lib/errors';

// ─── Public types ──────────────────────────────────────────────

/**
 * Audit-log granularity. Mirrors `AuditErrorPayload.boundaryLevel`.
 *
 *   - 'app'     — the outermost Sentry boundary in AppProvider
 *   - 'route'   — Next.js route segment error.tsx
 *   - 'feature' — FeatureBoundary wrapping a section of a page
 *   - 'widget'  — small inline boundaries (default)
 */
export type ErrorBoundaryLevel = 'app' | 'route' | 'feature' | 'widget';

/**
 * Props passed to a fallback when used as a render-prop. Function-
 * style fallbacks unlock category-aware UI without coupling the
 * boundary itself to the React tree (hooks).
 */
export interface ErrorBoundaryFallbackProps {
  /** The error caught. Always an Error subclass after componentDidCatch. */
  readonly error: Error;
  /** React-provided component stack — null when caught from a non-render path. */
  readonly errorInfo: React.ErrorInfo | null;
  /** Sentry event ID for cross-referencing in the dashboard. May be null in dev. */
  readonly eventId: string | null;
  /** Categorisation result from Phase 1 — pre-computed for the fallback. */
  readonly categorised: CategorizedError;
  /** Call to clear the boundary's error state and re-render children. */
  readonly resetBoundary: () => void;
}

/**
 * Props consumed by the boundary. All new props are optional —
 * the v1 surface (`children` + `fallback?: ReactNode`) keeps working.
 */
export interface ErrorBoundaryProps {
  /** The protected subtree. */
  readonly children: React.ReactNode;
  /**
   * Fallback UI. Two shapes supported:
   *   - ReactNode      — static UI; ignores per-error context
   *   - Render prop    — function receiving {error, errorInfo, ...}
   *                       — recommended for new code
   */
  readonly fallback?: React.ReactNode | ((props: ErrorBoundaryFallbackProps) => React.ReactNode);
  /** Boundary level — used for Sentry tags + audit log granularity. */
  readonly level?: ErrorBoundaryLevel;
  /**
   * Called when the boundary's "Try again" path runs. Use to reset
   * TanStack Query caches (via QueryErrorResetBoundary's `reset`),
   * Zustand slices, or any other recovery work.
   */
  readonly onReset?: () => void;
  /**
   * Called once per caught error AFTER Sentry/audit logging. Useful
   * for product analytics (e.g., PostHog "error_caught" event).
   */
  readonly onError?: (
    error: Error,
    errorInfo: React.ErrorInfo,
    categorised: CategorizedError,
  ) => void;
  /**
   * If any of these values changes between renders, the boundary
   * automatically clears its error state. Use for route params, list
   * IDs, etc. — so navigating to a sibling page re-tries rather than
   * sticking with the previous error UI.
   */
  readonly resetKeys?: ReadonlyArray<string | number | boolean | null | undefined>;
}

// ─── Internal state ────────────────────────────────────────────

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
  readonly errorInfo: React.ErrorInfo | null;
  readonly categorised: CategorizedError | null;
  readonly eventId: string | null;
}

const INITIAL_STATE: ErrorBoundaryState = {
  hasError: false,
  error: null,
  errorInfo: null,
  categorised: null,
  eventId: null,
};

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Shallow-equal for the resetKeys array. Returns true when both arrays
 * have identical references at the same indices (and identical length).
 */
function shallowArrayEqual(
  a: ReadonlyArray<unknown> | undefined,
  b: ReadonlyArray<unknown> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Coerce any thrown value into an Error. React's docs guarantee
 * componentDidCatch receives Error subclasses, but third-party libs
 * occasionally throw non-Error values (especially in async work that
 * gets re-thrown into render). Defensive wrapping ensures Sentry +
 * the fallback always have a stable shape.
 */
function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return new Error(value);
  try {
    return new Error(`Non-Error thrown: ${JSON.stringify(value)}`);
  } catch {
    return new Error('Non-Error thrown (unserialisable)');
  }
}

// ─── Class component ───────────────────────────────────────────

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = INITIAL_STATE;
    this.resetBoundary = this.resetBoundary.bind(this);
  }

  /**
   * React's static method to derive the next state from a caught
   * error. Runs synchronously during the commit phase; can't read
   * props or call methods. Categorisation moves to componentDidCatch
   * where we have access to React.ErrorInfo and lifecycle hooks.
   */
  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    // Re-throw Next.js framework control-flow errors so the framework
    // can handle redirect / notFound / unauthorized correctly.
    // Boundaries that swallow these BREAK navigation.
    if (isFrameworkControlFlow(error)) {
      throw error;
    }
    return { hasError: true, error: toError(error) };
  }

  override componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    // Defensive — a second-pass guard for non-render-path throws that
    // skip getDerivedStateFromError on legacy React paths.
    if (isFrameworkControlFlow(error)) {
      throw error;
    }

    const normalised = toError(error);
    const categorised = categorize(normalised);
    const level: ErrorBoundaryLevel = this.props.level ?? 'widget';

    // ── Sentry — capture with rich tags for triage ──
    let eventId: string | null = null;
    try {
      eventId = Sentry.captureException(normalised, {
        tags: {
          'error.category': categorised.category,
          'error.severity': categorised.severity,
          'boundary.level': level,
        },
        contexts: {
          react: {
            componentStack: errorInfo.componentStack ?? null,
          },
          datunError: {
            statusCode: categorised.statusCode ?? null,
            code: categorised.code ? String(categorised.code) : null,
            isRetryable: categorised.isRetryable,
          },
        },
      });
    } catch {
      // Sentry initialisation can fail in dev (no DSN). Swallow —
      // we still want the audit log + fallback UI to render.
    }

    // ── Audit log — fire-and-forget; never throws ──
    try {
      logErrorToAudit({
        sessionId: getAuditSessionId(),
        sentryEventId: eventId ?? Sentry.lastEventId() ?? null,
        category: categorised.category,
        severity: categorised.severity,
        // Recovery action is determined by the fallback at render time;
        // at catch time we don't yet know the user's intent, so record
        // the conservative default. Updated by retry-button when the
        // user actually clicks retry.
        recoveryAction: 'retry',
        retryCount: 0,
        statusCode: categorised.statusCode ?? null,
        code: categorised.code ? String(categorised.code) : null,
        errorName: categorised.name,
        diagnosticMessage: categorised.diagnosticMessage,
        boundaryLevel: level,
        pathname: typeof window !== 'undefined' ? window.location.pathname : 'ssr',
        clientTimestamp: new Date().toISOString(),
        locale: typeof navigator !== 'undefined' ? navigator.language : 'en',
      });
    } catch {
      // Audit log helper itself never throws, but the wrapper is here
      // as belt-and-braces against future maintainers.
    }

    // ── Dev-time console — full stack visible during local development ──
    if (process.env['NODE_ENV'] === 'development') {
      console.error(
        `[ErrorBoundary:${level}] Caught ${categorised.category}/${categorised.severity}:`,
        normalised,
        errorInfo.componentStack,
      );
    }

    // ── Caller-defined hook ──
    try {
      this.props.onError?.(normalised, errorInfo, categorised);
    } catch {
      // onError throwing must not cascade; the boundary's job is done.
    }

    // ── Promote categorisation + errorInfo + eventId into state ──
    this.setState({ errorInfo, categorised, eventId });
  }

  override componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // ── resetKeys — clear error state when any key changes ──
    if (this.state.hasError && !shallowArrayEqual(prevProps.resetKeys, this.props.resetKeys)) {
      this.resetBoundary();
    }
  }

  /**
   * Clear the error state and re-render children. Calls the
   * caller's `onReset` (typically `queryClient.resetQueries()` via
   * QueryErrorResetBoundary). Errors thrown by onReset are swallowed
   * so the boundary always reaches a clean idle state.
   */
  resetBoundary(): void {
    try {
      this.props.onReset?.();
    } catch {
      // onReset failures are extraordinarily rare; suppress so the
      // boundary's state still resets and children get a fresh start.
    }
    this.setState(INITIAL_STATE);
  }

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // We have an error. Compose the fallback props once for both
    // render-prop and ReactNode paths.
    const error = this.state.error ?? new Error('Unknown error');
    const categorised = this.state.categorised ?? categorize(error);

    const fallbackProps: ErrorBoundaryFallbackProps = {
      error,
      errorInfo: this.state.errorInfo,
      eventId: this.state.eventId,
      categorised,
      resetBoundary: this.resetBoundary,
    };

    // Render-prop fallback (preferred for new code)
    if (typeof this.props.fallback === 'function') {
      return this.props.fallback(fallbackProps);
    }

    // Static ReactNode fallback (v1 API — still supported)
    if (this.props.fallback) {
      return this.props.fallback;
    }

    // No fallback supplied — render a minimal default so the boundary
    // never returns nothing (which React 19 logs as an error).
    return (
      <div role="alert" aria-live="assertive" className="p-4 text-center text-sm">
        <p className="font-medium">Something went wrong.</p>
        <button
          type="button"
          onClick={this.resetBoundary}
          className="mt-2 text-primary underline underline-offset-4"
        >
          Try again
        </button>
      </div>
    );
  }
}
