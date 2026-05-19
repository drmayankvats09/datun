// ═══════════════════════════════════════════════════════════════
// AUTH BROADCAST — Cross-tab auth event primitives
//
// Pure utility module — has ZERO dependencies on Zustand stores so it
// can be unit-tested in isolation and reused by other auth flows
// (e.g., service-worker handlers, devtools panels) without import cycles.
//
// What this module handles:
//   - Channel name + stale-message threshold constants (one source of truth)
//   - `broadcastAuthEvent` — emit a 'login' / 'logout' event to other tabs
//   - `isCrossTabReload` / `clearCrossTabFlag` — sessionStorage-based
//     re-broadcast guard (prevents infinite loops when tab B receives
//     tab A's login event, reloads, hydrates state, and would otherwise
//     re-broadcast its own login)
//   - `_listenCrossTabAuth` — low-level listener (dependency-injected via
//     handler callbacks, no store coupling)
//
// What this module does NOT handle:
//   - Direct Zustand store mutations (caller injects via handlers)
//   - Router navigation (caller controls window.location)
//
// The high-level `listenCrossTabAuth()` (zero-arg signature for backward
// compat with app-provider.tsx) lives in `auth.store.ts` and uses
// `_listenCrossTabAuth` from here with auth-specific handlers.
//
// Why this layering exists:
//   - SOLID dependency-inversion: high-level auth.store depends on the
//     low-level broadcast primitive, not vice versa.
//   - Testability: this file's primitives can be tested with a fake
//     BroadcastChannel and no store imports.
//   - Future-proofing: if we add a service worker that needs to react
//     to auth events, it imports from here, not auth.store.
// ═══════════════════════════════════════════════════════════════

/** Name of the BroadcastChannel used for cross-tab auth events. */
const AUTH_CHANNEL_NAME = 'datun-auth-sync';

/**
 * sessionStorage key that marks the current tab as "currently processing
 * a cross-tab login event" — prevents re-broadcast loops. Tab A logs in
 * → broadcasts → Tab B receives → reloads → setUser fires → without this
 * flag Tab B would re-broadcast → Tab A would reload → forever.
 */
const CROSS_TAB_FLAG_KEY = 'datun-cross-tab-reload';

/**
 * Maximum age (ms) of a broadcast message we still react to. Messages
 * older than this are ignored — they're stale (e.g., a tab that was
 * suspended for an hour and just woke up to fire an old event).
 */
const STALE_MESSAGE_THRESHOLD_MS = 5_000;

/** Event payload shape. */
export interface AuthBroadcastEvent {
  type: 'login' | 'logout';
  timestamp: number;
}

/** Listener handler callbacks — caller injects to receive events. */
export interface AuthBroadcastHandlers {
  /** Called when another tab broadcasts a logout event. */
  onLogout: () => void;
  /** Called when another tab broadcasts a login event. */
  onLogin: () => void;
}

// ─── Broadcast (emit) ─────────────────────────────────────────

/**
 * Emit an auth event to all other tabs on the same origin.
 *
 * Best-effort: silently no-ops in environments without BroadcastChannel
 * (Safari 13.x, certain WebViews, server-side rendering). Modern browsers
 * (Chrome, Firefox, Safari 14+, Edge) all support it.
 *
 * @param type - 'login' (user just authenticated) or 'logout' (user signed out)
 */
export function broadcastAuthEvent(type: 'login' | 'logout'): void {
  try {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    const payload: AuthBroadcastEvent = { type, timestamp: Date.now() };
    channel.postMessage(payload);
    // Close the channel immediately — we only sent one message; this
    // releases resources and prevents this tab from receiving its own echo.
    channel.close();
  } catch {
    // BroadcastChannel construction can throw in sandboxed iframes —
    // silently degrade; in-tab state still works, just no cross-tab sync.
  }
}

// ─── Re-broadcast guard (sessionStorage flag) ─────────────────

/**
 * Check whether the current tab is in the middle of processing a
 * cross-tab login event (i.e., another tab logged in, this tab is
 * about to reload + hydrate). Used by `auth.store.setUser` to skip
 * re-broadcasting and avoid an infinite loop.
 */
export function isCrossTabReload(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(CROSS_TAB_FLAG_KEY) !== null;
  } catch {
    // sessionStorage disabled — defensive default: no flag means
    // we'll re-broadcast normally. Worst case: brief loop that the
    // 5s stale-message threshold breaks.
    return false;
  }
}

/**
 * Mark the current tab as "processing a cross-tab login" — set right
 * before `window.location.reload()` so the post-reload setUser call
 * can detect it and suppress re-broadcast.
 */
export function markCrossTabReload(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CROSS_TAB_FLAG_KEY, '1');
  } catch {
    // Quota / disabled — degrade to "re-broadcast happens once",
    // which 5s stale-threshold will absorb.
  }
}

/**
 * Clear the cross-tab reload flag. Called by `auth.store.setUser`
 * after it detects + handles the flag.
 */
export function clearCrossTabFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CROSS_TAB_FLAG_KEY);
  } catch {
    // ignore — best-effort
  }
}

// ─── Listener (receive) ───────────────────────────────────────

/**
 * Low-level listener — registers a BroadcastChannel onmessage handler
 * that dispatches to caller-provided callbacks.
 *
 * The HIGH-LEVEL wrapper lives in `auth.store.ts` as `listenCrossTabAuth()`
 * (zero-arg, backward-compatible signature) — it injects the standard
 * auth-store + router handlers.
 *
 * Use this low-level form directly only if you need to react to auth
 * events from non-React code (e.g., a service worker, a vanilla JS
 * analytics layer).
 *
 * @param handlers - Caller-provided callbacks for login/logout events
 * @returns Cleanup function that closes the channel. Idempotent —
 *          safe to call multiple times. Returns a no-op cleanup if
 *          BroadcastChannel isn't available.
 *
 * @example
 * ```ts
 * import { useAuthStore } from './auth.store';
 * import { _listenCrossTabAuth, markCrossTabReload } from './auth-broadcast';
 *
 * const cleanup = _listenCrossTabAuth({
 *   onLogout: () => {
 *     useAuthStore.setState({ user: null, isLoading: false, lastSyncedAt: null });
 *     window.location.href = '/login';
 *   },
 *   onLogin: () => {
 *     markCrossTabReload();
 *     window.location.reload();
 *   },
 * });
 * // later:
 * cleanup();
 * ```
 */
export function _listenCrossTabAuth(handlers: AuthBroadcastHandlers): () => void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return () => {};
  }

  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
  } catch {
    // Sandboxed iframe or other construction failure — return no-op cleanup.
    return () => {};
  }

  channel.onmessage = (event: MessageEvent<AuthBroadcastEvent>) => {
    const data = event.data;

    // Defensive: ignore malformed messages (e.g., from a future schema
    // version we don't recognize).
    if (
      typeof data !== 'object' ||
      data === null ||
      typeof data.type !== 'string' ||
      typeof data.timestamp !== 'number'
    ) {
      return;
    }

    // Ignore stale messages — protects against suspended tabs waking
    // up and replaying old events.
    if (Date.now() - data.timestamp > STALE_MESSAGE_THRESHOLD_MS) {
      return;
    }

    if (data.type === 'logout') {
      handlers.onLogout();
    } else if (data.type === 'login') {
      handlers.onLogin();
    }
    // Unknown event type → silently ignore (forward compatibility).
  };

  // Idempotent cleanup — `BroadcastChannel.close()` after close is a no-op
  // in spec (no error), but we guard with a try/catch out of paranoia.
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    try {
      channel.close();
    } catch {
      // ignore
    }
  };
}
