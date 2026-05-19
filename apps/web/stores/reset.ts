// ═══════════════════════════════════════════════════════════════
// STORE RESET — Coordinated multi-store cleanup utilities
//
// Two functions:
//   resetAllStores()     — logout flow (preserves UX preferences)
//   hardResetAllStores() — account deletion flow (nukes everything)
//
// Called on:
//   - Explicit logout (auth.store clears tokens, this clears the rest)
//   - "Switch user" flow on a shared device
//   - Account deletion confirmation (hardReset variant)
//   - Privacy-mode reset button (hardReset variant)
//
// What gets cleared by `resetAllStores`:
//   ✓ Auth user (via auth.store.clearUser — also broadcasts cross-tab)
//   ✓ Consultation state (active ID, messages, intake draft)
//   ✓ Ephemeral UI state (sidebar position, last route, drawer open state)
//
// What is DELIBERATELY PRESERVED by `resetAllStores`:
//   ✗ welcomeBannerDismissed (UX preference, NOT user data)
//   ✗ consultationSortOrder  (UX preference, NOT user data)
//   ✗ Theme preference        (managed by next-themes, NOT Zustand)
//
// Why preserve UX prefs: a returning user shouldn't see the onboarding
// welcome banner again JUST because they logged out and back in. They
// already saw it, they already dismissed it. Pattern: Stripe Dashboard —
// "do not delete on logout" includes muscle-memory preferences.
//
// `hardResetAllStores` ignores this rule — used only for "Delete my
// account" where the user explicitly wants a brand-new-user experience.
//
// Why a separate file (vs a method on each store):
//   - Cross-store coordination wants to live OUTSIDE any individual store
//   - Importing all stores into auth.store would create circular deps
//   - Discoverability: one obvious file to grep when looking for "wipe"
// ═══════════════════════════════════════════════════════════════

import { useAuthStore } from './auth.store';
import { useConsultationStore } from './consultation.store';
import { useUIStore } from './ui.store';

/** Persisted storage keys (must match each store's persist `name` option). */
const STORAGE_KEYS = ['datun-auth', 'datun-consultation', 'datun-ui'] as const;

/**
 * Reset all client-side stores to a logged-out baseline.
 *
 * Idempotent — safe to call multiple times.
 * Safe to call from non-React code (uses `.getState()` / `.setState()`,
 * no hooks involved). Common callsites: logout handler, auth-sync
 * listener (when another tab logs out), session-expiry interceptor.
 *
 * Note on cross-tab behavior: `clearUser()` broadcasts a logout event
 * to other tabs via BroadcastChannel; those tabs then call this same
 * function via the cross-tab listener (`useAuthSync` hook), achieving
 * synchronized cleanup across all open tabs.
 *
 * @example Standard logout flow
 * ```ts
 * // hooks/use-logout.ts (Phase 2)
 * import { useRouter } from 'next/navigation';
 * import { resetAllStores } from '@/stores/reset';
 *
 * export function useLogout() {
 *   const router = useRouter();
 *   return async () => {
 *     await fetch('/api/auth/logout', { method: 'POST' });
 *     resetAllStores();
 *     router.replace('/login');
 *   };
 * }
 * ```
 */
export function resetAllStores(): void {
  // 1. AUTH — clears user, broadcasts cross-tab logout via BroadcastChannel.
  useAuthStore.getState().clearUser();

  // 2. CONSULTATION — wipes messages, intake draft, active ID, etc.
  //    `clearConsultation` is the store's own purpose-built action.
  useConsultationStore.getState().clearConsultation();

  // 3. UI — reset ephemeral state only. PRESERVE UX preferences.
  //
  //    We use `setState` with an explicit action label (vs calling individual
  //    actions like `setSidebarCollapsed(false)`) for two reasons:
  //
  //    (a) Atomicity — one DevTools timeline entry instead of four,
  //        easier to debug "what happened on logout?"
  //    (b) No dedicated `resetEphemeral` action exists on ui.store, and
  //        adding one would force ui.store to know about logout — that's
  //        a leaky cross-store concern that belongs HERE, not there.
  //
  //    The third arg `'ui/resetEphemeral'` is the devtools action label —
  //    ui.store wraps with `devtools` middleware which supports this.
  const currentUI = useUIStore.getState();
  useUIStore.setState(
    {
      sidebarCollapsed: false,
      lastVisitedRoute: null,
      historyDrawerOpen: false,
      // PRESERVED — UX preferences survive logout (Stripe pattern):
      welcomeBannerDismissed: currentUI.welcomeBannerDismissed,
      consultationSortOrder: currentUI.consultationSortOrder,
    },
    false,
    'ui/resetEphemeral',
  );
}

/**
 * HARD reset — wipes EVERYTHING including UX preferences.
 *
 * Use cases (NOT for routine logout):
 *   - "Delete my account" flow where the user wants a clean slate.
 *   - "Reset all settings" power-user option (Phase 3+).
 *   - Privacy-mode "forget this device" button.
 *
 * Defense in depth: also clears `localStorage` keys directly, in case
 * persist middleware hasn't flushed yet OR an older deploy left orphan
 * keys behind.
 *
 * @example Account deletion confirmation handler
 * ```ts
 * async function confirmDelete() {
 *   await fetch('/api/account/delete', { method: 'POST' });
 *   hardResetAllStores();
 *   window.location.href = '/'; // full reload to flush in-memory caches
 * }
 * ```
 */
export function hardResetAllStores(): void {
  // 1. AUTH — clears + broadcasts.
  useAuthStore.getState().clearUser();

  // 2. CONSULTATION — full wipe.
  useConsultationStore.getState().clearConsultation();

  // 3. UI — full wipe INCLUDING UX prefs.
  useUIStore.setState(
    {
      sidebarCollapsed: false,
      lastVisitedRoute: null,
      historyDrawerOpen: false,
      // NOT preserved this time:
      welcomeBannerDismissed: false,
      consultationSortOrder: 'newest',
    },
    false,
    'ui/hardReset',
  );

  // 4. Defense in depth — nuke localStorage entries directly.
  //    Best-effort: try/catch because Safari Private mode / disabled
  //    storage / quota-exceeded can throw. The in-memory resets above
  //    already handled the user-facing state; this is paranoid cleanup.
  if (typeof window !== 'undefined') {
    for (const key of STORAGE_KEYS) {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore — best-effort
      }
    }
  }
}
