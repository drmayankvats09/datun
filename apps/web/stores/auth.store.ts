// ═══════════════════════════════════════════════════════════════
// AUTH STORE — Reactive user state with persistence + DevTools
// Tokens live in lib/auth.ts (httpOnly cookies). This store = user
// profile fields + UI loading state. Pattern: Clerk / Supabase —
// auth lib handles tokens, store handles UI-reactive identity.
//
// Phase 2 upgrades over the original auth.store.ts:
//   - Composes Phase 1 middleware stack:
//       logger → analytics → devtools → persist
//   - Hydration tracking via withHydration() + __hasHydrated flag
//   - Cross-tab broadcast logic extracted to ./auth-broadcast.ts
//     (testable, reusable, no store coupling)
//   - Persist version bumped 1 → 2 with idempotent migration
//   - Encrypted storage NOT applied here (no PII; user object is
//     {id, email, name, role} — already public enough; tokens are
//     in httpOnly cookies which Zustand never sees)
//   - TTL NOT applied (auth state shouldn't expire — user stays
//     "logged in" until they actively log out)
//
// Public API — 100% backward compatible. Every existing component
// import keeps working exactly as before:
//   useAuthStore() — full state hook
//   useAuthStore((s) => s.user) — selector
//   useAuthStore.getState() / .setState() — vanilla access
//   useAuthStore.subscribe() — vanilla subscription
//   listenCrossTabAuth() — zero-arg cross-tab listener (re-exported)
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';

import { createSafeStorage } from '@/lib/storage';
import type { AuthUser } from '@/lib/auth';
import type { WithHydration } from './types';

// Phase 1 middleware
import { devtoolsEnabled, devtoolsName } from './devtools-config';
import { logger, analytics, withHydration, createHydrationState } from './middleware';

// Phase 2 — extracted broadcast primitives
import {
  broadcastAuthEvent,
  isCrossTabReload,
  clearCrossTabFlag,
  markCrossTabReload,
  _listenCrossTabAuth,
} from './auth-broadcast';

// ─── Types ────────────────────────────────────────────────────

/**
 * Full state shape of the auth store. Extends `WithHydration` to gain
 * the `__hasHydrated` flag that flips true once persist completes.
 *
 * `user`, `isLoading`, `lastSyncedAt` field names + types are preserved
 * exactly from the v1 store — no component changes needed.
 */
interface AuthState extends WithHydration {
  /** Authenticated user object, or null if logged out. */
  user: AuthUser | null;
  /**
   * `true` from app boot until the first auth-sync resolves
   * (`setUser` or `clearUser` called). Used to render a splash on
   * first paint to avoid logged-out flash.
   */
  isLoading: boolean;
  /** Unix epoch ms of the last successful auth sync, or null. */
  lastSyncedAt: number | null;

  /** Set the authenticated user (success path from getMe / login). */
  setUser: (user: AuthUser) => void;
  /** Set the loading flag — typically only used to set false. */
  setLoading: (loading: boolean) => void;
  /** Clear the authenticated user (logout / 401 / token expiry). */
  clearUser: () => void;
  /** Patch user fields without overwriting the rest (profile edit). */
  updateUser: (partial: Partial<AuthUser>) => void;
}

// ─── Persist version + migration ──────────────────────────────

const PERSIST_VERSION = 2;

/**
 * v0 → v1 (original): added lastSyncedAt
 * v1 → v2 (Phase 2):  no schema changes; bump for cache-bust safety
 *                     after the storage layer was upgraded.
 *
 * Migration is idempotent — only fills defaults for missing fields.
 */
function migrate(persisted: unknown, version: number): Partial<AuthState> {
  const state = (persisted && typeof persisted === 'object' ? persisted : {}) as Record<
    string,
    unknown
  >;

  if (version < 1) {
    state.lastSyncedAt = state.lastSyncedAt ?? null;
  }
  // v2 introduces no new persisted fields (just storage-layer upgrades).

  return state as Partial<AuthState>;
}

// ─── Store ────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  logger(
    analytics(
      devtools(
        persist(
          (set) => ({
            // Hydration tracking (Phase 1 mixin)
            ...createHydrationState<AuthState>(set),

            // State defaults
            user: null,
            isLoading: true,
            lastSyncedAt: null,

            // ─── Actions ───────────────────────────────────────

            setUser: (user) => {
              set({ user, isLoading: false, lastSyncedAt: Date.now() }, false, 'auth/setUser');

              // Cross-tab loop guard: if this setUser was triggered by
              // a reload caused by another tab's broadcast, don't re-
              // broadcast (would cause an infinite cascade).
              if (isCrossTabReload()) {
                clearCrossTabFlag();
                return;
              }
              broadcastAuthEvent('login');
            },

            setLoading: (isLoading) => set({ isLoading }, false, 'auth/setLoading'),

            clearUser: () => {
              set({ user: null, isLoading: false, lastSyncedAt: null }, false, 'auth/clearUser');
              // Notify other tabs immediately so they can log out too.
              broadcastAuthEvent('logout');
            },

            updateUser: (partial) =>
              set(
                (state) => ({
                  user: state.user ? { ...state.user, ...partial } : null,
                }),
                false,
                'auth/updateUser',
              ),
          }),
          withHydration<AuthState>({
            name: 'datun-auth',
            version: PERSIST_VERSION,
            storage: createJSONStorage(() => createSafeStorage()),

            // SECURITY: persist ONLY non-sensitive fields.
            //   - Tokens are in httpOnly cookies; never in this store.
            //   - `isLoading` is a transient UI flag — always `true` on
            //     boot (until first sync), never persisted.
            //   - `__hasHydrated` and `__setHasHydrated` are hydration
            //     internals — must always start fresh.
            partialize: (state) =>
              ({
                user: state.user,
                lastSyncedAt: state.lastSyncedAt,
              }) as Partial<AuthState>,

            migrate,
          }),
        ),
        // devtools options
        { name: devtoolsName('Auth'), enabled: devtoolsEnabled },
      ),
      // analytics options
      {
        storeName: 'auth',
        events: {
          // Funnel events — analytics middleware allowlists these,
          // PII is auto-filtered by the middleware's safe-payload extractor.
          'auth/setUser': 'auth_logged_in',
          'auth/clearUser': 'auth_logged_out',
          'auth/updateUser': 'auth_profile_updated',
        },
      },
    ),
    // logger options
    { name: 'Auth' },
  ),
);

// ─── Cross-tab listener (backward-compatible API) ─────────────

/**
 * Listen for auth events from other tabs. Call ONCE in app shell.
 * Returns a cleanup function.
 *
 * This is the public API that `app-provider.tsx` calls via
 * `import { listenCrossTabAuth } from '@/stores'`. The function takes
 * no arguments and wires the standard handlers internally:
 *   - On 'logout' event: clear local store (silently, no re-broadcast)
 *                        and redirect to /login.
 *   - On 'login' event: mark this tab as a cross-tab reload (so the
 *                       post-reload setUser doesn't re-broadcast) then
 *                       reload to pick up fresh server state.
 *
 * If you need to react to auth events from non-React code with custom
 * handlers (e.g., service worker, vanilla analytics), import
 * `_listenCrossTabAuth` directly from `./auth-broadcast`.
 */
export function listenCrossTabAuth(): () => void {
  return _listenCrossTabAuth({
    onLogout: () => {
      // Clear state directly without going through `clearUser` action —
      // `clearUser` would re-broadcast, causing a loop. Direct setState
      // is silent (no broadcast).
      useAuthStore.setState({
        user: null,
        isLoading: false,
        lastSyncedAt: null,
      });
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    },
    onLogin: () => {
      // Mark the reload as cross-tab originated so the next setUser
      // (which runs after the reload during auth-sync hydration)
      // doesn't re-broadcast.
      markCrossTabReload();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    },
  });
}
