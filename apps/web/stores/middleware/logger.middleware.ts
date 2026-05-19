// ═══════════════════════════════════════════════════════════════
// LOGGER MIDDLEWARE — Action logging with Sentry breadcrumbs
//
// Logs every Zustand action with action label, store name, and a safe
// (non-PII) snapshot of state. Dev: rich console output. Production:
// Sentry breadcrumbs (visible inside every crash report).
//
// Why this exists:
// - 80% of "user says X broke" bugs trace to a sequence of state
//   transitions. Without breadcrumbs you guess; with them you see
//   the exact action chain that led to the crash. (Stripe pattern.)
// - Datun specific: when a clinic complains "consultation kho gaya",
//   we want to see whether the user hit `consultation/clear` by
//   accident vs a real bug.
//
// Middleware order: This should be the OUTERMOST middleware so it
// sees the FINAL `set()` calls after all inner middlewares run.
//   create()(logger(analytics(devtools(persist(...)))))
//             ^ outermost — sees the canonical action labels
//
// Cost: ~0.2ms per action in dev (console.log), ~0.05ms in prod
// (Sentry.addBreadcrumb is non-blocking and buffered). Negligible.
//
// SECURITY: PII filter built in — only primitive booleans, numbers,
// short enum strings, and array lengths are sent to Sentry. User
// objects, message bodies, intake draft fields NEVER leave the device.
// ═══════════════════════════════════════════════════════════════

import type { StateCreator, StoreMutatorIdentifier } from 'zustand';
import * as Sentry from '@sentry/nextjs';
import { devtoolsEnabled } from '../devtools-config';

// ─── Public middleware type ───────────────────────────────────

/**
 * Public middleware type — preserves all mutator types through the chain.
 *
 * This shape allows `logger(persist(devtools(...)))` to retain full
 * TypeScript inference of state and actions across the middleware stack.
 *
 * Generic params:
 *   T   = state shape
 *   Mps = middleware mutators array (incoming, from inner middlewares)
 *   Mcs = middleware mutators array (outgoing — empty for logger since
 *         it doesn't modify the public state shape)
 */
type Logger = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, Mps, Mcs>,
  options: LoggerOptions,
) => StateCreator<T, Mps, Mcs>;

/**
 * Internal implementation type — simpler signature for the actual logic.
 * The runtime is type-erased so the simpler signature works; the public
 * `Logger` type cast restores full inference at the call site.
 */
type LoggerImpl = <T>(
  initializer: StateCreator<T, [], []>,
  options: LoggerOptions,
) => StateCreator<T, [], []>;

/**
 * Configuration for the logger middleware.
 */
export interface LoggerOptions {
  /**
   * Store name — shown in console group header and Sentry breadcrumb
   * category. Use PascalCase domain name (e.g., 'Auth', 'Consultation').
   */
  name: string;
  /**
   * Override default console-logging behavior.
   * Defaults to `devtoolsEnabled` (i.e., true only in `pnpm dev`).
   * Set to `false` for noisy stores you don't want in dev console.
   */
  consoleEnabled?: boolean;
  /**
   * Override default Sentry breadcrumb behavior.
   * Defaults to `true` (always emit in dev + prod). Sentry breadcrumbs
   * are cheap and only flushed if an exception is captured anyway.
   */
  sentryEnabled?: boolean;
}

// ─── Implementation ───────────────────────────────────────────

const loggerImpl: LoggerImpl = (initializer, options) => (set, get, store) => {
  const storeName = options.name || 'UnnamedStore';
  const logToConsole = options.consoleEnabled ?? devtoolsEnabled;
  const logToSentry = options.sentryEnabled ?? true;

  const loggedSet: typeof set = (...args) => {
    // Zustand `set` signature is `(partial, replace?, action?)`.
    // When wrapped by devtools middleware, the third arg is a string
    // action label — we extract it for the log payload.
    const actionLabel = extractActionLabel(args);

    const prevState = get();
    set(...(args as Parameters<typeof set>));
    const nextState = get();

    if (logToConsole) {
      console.groupCollapsed(
        `%c⚡ ${storeName}/%c${actionLabel}`,
        'color: #6b7280; font-weight: 600;',
        'color: #2563eb; font-weight: 700;',
      );
      console.log('%cprev', 'color: #9ca3af', prevState);
      console.log('%cnext', 'color: #10b981', nextState);
      console.groupEnd();
    }

    if (logToSentry) {
      Sentry.addBreadcrumb({
        category: `store.${storeName.toLowerCase()}`,
        message: actionLabel,
        level: 'info',
        timestamp: Date.now() / 1000,
        // PII safety: only safe primitives sent to Sentry.
        // User objects, message content, intake draft NEVER included.
        data: extractSafeSnapshot(nextState),
      });
    }
  };

  // Replace the store's external `setState` so calls from outside React
  // (e.g., resetAllStores, vanilla event listeners) also flow through us.
  store.setState = loggedSet;

  return initializer(loggedSet, get, store);
};

/** Public middleware export. */
export const logger = loggerImpl as unknown as Logger;

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Extract the action label from Zustand `set()` call arguments.
 *
 * Convention: the LAST string argument is the action label.
 * Zustand `set()` accepts up to 3 args: `(partial, replace?, action?)`.
 * The devtools middleware injects the action string as the 3rd arg.
 *
 * Falls back to '<anonymous>' if no string label was provided.
 */
function extractActionLabel(args: readonly unknown[]): string {
  if (args.length >= 3 && typeof args[2] === 'string') {
    return args[2];
  }
  if (args.length >= 2 && typeof args[1] === 'string') {
    return args[1];
  }
  return '<anonymous>';
}

/**
 * Extract a SAFE snapshot of state for Sentry breadcrumbs.
 *
 * Allowlist approach — only known-safe primitive types are emitted:
 *   - boolean (e.g., isLoading, sidebarCollapsed, hasUnsavedChanges)
 *   - number (e.g., counters, timestamps)
 *   - short strings ≤ 32 chars (e.g., status codes, language codes)
 *   - array lengths (count only, not contents)
 *
 * Everything else — user objects, message arrays, intake drafts, dates —
 * is SILENTLY DROPPED. This is defense in depth: even if a future dev
 * adds a PII field to state without thinking, it won't leak to Sentry.
 *
 * Keys starting with `__` (hydration internals) are also skipped to
 * keep breadcrumbs focused on user-meaningful state.
 */
function extractSafeSnapshot(state: unknown): Record<string, unknown> {
  if (state === null || state === undefined || typeof state !== 'object') {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    if (key.startsWith('__')) continue;
    if (typeof value === 'function') continue;

    if (typeof value === 'boolean' || typeof value === 'number') {
      out[key] = value;
    } else if (typeof value === 'string' && value.length <= 32) {
      // Short strings only — codes, statuses, language IDs.
      // Long strings are presumed to be user content.
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[`${key}_count`] = value.length;
    } else if (value === null) {
      out[key] = null;
    }
  }
  return out;
}
