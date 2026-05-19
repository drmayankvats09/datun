// ═══════════════════════════════════════════════════════════════
// ANALYTICS MIDDLEWARE — Track marketing-funnel state transitions
//
// Intercepts specific Zustand actions and emits PostHog events.
// Powers the conversion funnel dashboard: how many users start an
// intake → send the first message → complete the consultation →
// download the report.
//
// Why a store middleware (vs `posthog.capture()` calls in components):
// - Components shouldn't know about analytics — separation of concerns.
// - Store actions are the canonical event source (Stripe pattern):
//   one source of truth, no risk of double-firing from two components.
// - One allowlist file = easy DPDP/GDPR review of "what we track" —
//   auditors can grep for `events:` and see every tracked event.
//
// DPDP / GDPR compliance:
// - Only ALLOWLISTED action labels emit events. Default = no event.
// - Payload is filtered by `extractSafePayload` (booleans, numbers,
//   short enums, array lengths only). Patient names, message content,
//   photos NEVER hit PostHog.
// - Consent: PostHog client is initialized in the app shell only after
//   the consent banner is accepted (see `components/consent/`). This
//   middleware safely no-ops if PostHog isn't ready or wasn't loaded.
//
// Recommended middleware order:
//   create()(logger(analytics(devtools(persist(...)))))
//                    ^ analytics sits INSIDE logger so logger sees
//                      everything; analytics filters to funnel events.
//
// Phase 1 ships the middleware. Phase 2 wires it into auth + consultation
// stores once Task #49 (PostHog feature flags) brings the PostHog client.
// ═══════════════════════════════════════════════════════════════

import type { StateCreator, StoreMutatorIdentifier } from 'zustand';

// ─── Public middleware type ───────────────────────────────────

type Analytics = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  initializer: StateCreator<T, Mps, Mcs>,
  options: AnalyticsOptions,
) => StateCreator<T, Mps, Mcs>;

type AnalyticsImpl = <T>(
  initializer: StateCreator<T, [], []>,
  options: AnalyticsOptions,
) => StateCreator<T, [], []>;

/**
 * Configuration for the analytics middleware.
 */
export interface AnalyticsOptions {
  /**
   * Store name — included in event properties for filtering in PostHog
   * dashboards (e.g., "events from the consultation store only").
   */
  storeName: string;
  /**
   * Allowlist mapping `actionLabel → posthogEventName`.
   *
   * Actions NOT present in this map are silently ignored (zero PostHog
   * calls). This is the security gate — anything you don't explicitly
   * track here will NEVER reach PostHog.
   *
   * Naming convention for PostHog event names: snake_case verbs
   * (e.g., `consultation_started`, `message_sent`, `report_downloaded`).
   *
   * @example
   * ```ts
   * events: {
   *   'consultation/start':      'consultation_started',
   *   'consultation/addMessage': 'message_sent',
   *   'consultation/setStatus':  'consultation_status_changed',
   * }
   * ```
   */
  events: Record<string, string>;
  /**
   * Override default enabled detection.
   * Default behavior: emit if `window.posthog` is loaded; skip otherwise.
   * Set to `false` for tests or to globally disable a store's analytics.
   */
  enabled?: boolean;
}

// ─── Implementation ───────────────────────────────────────────

const analyticsImpl: AnalyticsImpl = (initializer, options) => (set, get, store) => {
  const trackedSet: typeof set = (...args) => {
    // Run the actual state update FIRST so analytics never delays UX.
    const actionLabel = extractActionLabel(args);
    set(...(args as Parameters<typeof set>));

    // Hard disable check.
    if (options.enabled === false) return;

    // Allowlist check — silently skip non-funnel actions.
    const eventName = options.events[actionLabel];
    if (!eventName) return;

    // PostHog availability check — gracefully no-op if not loaded.
    const posthog = getPostHog();
    if (!posthog) return;

    try {
      posthog.capture(eventName, {
        // `$set` is PostHog's profile-property setter — useful for funnels.
        $set: { last_store_action: `${options.storeName}/${actionLabel}` },
        store: options.storeName,
        action: actionLabel,
        ...extractSafePayload(get()),
      });
    } catch (error) {
      // Analytics must NEVER block app behavior — swallow and continue.
      console.warn(`[analytics] capture failed for ${actionLabel}:`, error);
    }
  };

  // Replace store's external setState so non-React callers also flow through.
  store.setState = trackedSet;

  return initializer(trackedSet, get, store);
};

/** Public middleware export. */
export const analytics = analyticsImpl as unknown as Analytics;

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Extract the action label from Zustand `set()` call arguments.
 * Convention: the LAST string argument is the label.
 */
function extractActionLabel(args: readonly unknown[]): string {
  if (args.length >= 3 && typeof args[2] === 'string') return args[2];
  if (args.length >= 2 && typeof args[1] === 'string') return args[1];
  return '<anonymous>';
}

/** Minimal interface — we only call `capture`. */
interface PostHogLike {
  capture: (eventName: string, properties?: Record<string, unknown>) => void;
}

/**
 * PostHog client accessor.
 *
 * Looks up `window.posthog` (loaded by the app shell AFTER user consent
 * via `components/consent/`). Returns `null` if PostHog isn't initialized
 * yet or wasn't installed at all. SSR-safe: returns null when no window.
 */
function getPostHog(): PostHogLike | null {
  if (typeof window === 'undefined') return null;
  const candidate = (window as unknown as { posthog?: unknown }).posthog;
  if (
    typeof candidate === 'object' &&
    candidate !== null &&
    'capture' in candidate &&
    typeof (candidate as { capture: unknown }).capture === 'function'
  ) {
    return candidate as PostHogLike;
  }
  return null;
}

/**
 * Filter state to only safe (non-PII) primitive fields for the event payload.
 * Same allowlist principle as logger middleware — defense in depth.
 *
 * Allowed:
 *   - boolean (e.g., isLoading, hasUnsavedChanges)
 *   - number (e.g., counters, scores)
 *   - short strings ≤ 32 chars (e.g., status codes, language codes)
 *   - array lengths (count only, never contents)
 *
 * Skipped:
 *   - keys starting with `__` (hydration internals)
 *   - functions (actions)
 *   - long strings (likely user content)
 *   - objects (likely user / nested PII)
 */
function extractSafePayload(state: unknown): Record<string, unknown> {
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
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[`${key}_count`] = value.length;
    }
  }
  return out;
}
