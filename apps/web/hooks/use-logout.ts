// ═══════════════════════════════════════════════════════════════
// USE-LOGOUT — Centralized logout flow hook
//
// One hook. One source of truth. One way to log out.
//
// The full logout flow has FIVE ordered steps:
//   1. Call POST /api/auth/logout — clears the httpOnly refresh cookie
//      on the backend. (lib/auth.logout, defined elsewhere.)
//   2. Clear local tokens via `clearTokens()` — wipes the access token
//      from in-memory + storage.
//   3. Call `resetAllStores()` — clears auth + consultation + ephemeral
//      UI state. PRESERVES UX preferences (welcome banner, sort order).
//   4. Push a "Signed out" toast for confirmation feedback.
//   5. Router push to /login.
//
// Why a hook (not a plain function in lib/):
//   - Needs the Next.js `useRouter` for SPA navigation (no full reload).
//   - Exposes a `pending` boolean so the "Log out" button can show a
//     spinner and disable itself, preventing double-clicks (which would
//     fire two POST /logout calls — annoying but harmless, still bad UX).
//
// Why coordinated cleanup matters:
//   - If you ONLY clear local state, the backend cookie still authorizes
//     access — someone with browser history can hit /admin and re-login
//     silently (token refresh succeeds). Backend-first.
//   - If you ONLY clear backend, local Zustand state still shows the
//     user as logged in until a refresh — bad UX, looks broken.
//
// Error handling:
//   - Network failure on POST /logout: we STILL proceed with local
//     cleanup + redirect. From the user's perspective they "logged out";
//     the orphaned cookie expires on its own + the next access-token
//     refresh will fail and they'll be re-prompted to log in anyway.
//   - We toast the error so the user knows about it but don't block.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { resetAllStores } from '@/stores/reset';
import { useUIStore } from '@/stores/ui.store';
import { logout as apiLogout, clearTokens } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────

export interface UseLogoutResult {
  /**
   * Trigger the logout flow. Idempotent — calling twice while the first
   * call is in-flight is a silent no-op (guarded by `pending`).
   *
   * @returns Promise that resolves AFTER local cleanup completes, but
   *          BEFORE the router redirect fires (so callers awaiting it
   *          can do additional work pre-redirect if needed).
   */
  logout: () => Promise<void>;

  /**
   * `true` from the moment `logout()` is called until the flow completes
   * (success or error). Use to disable the trigger button + show a
   * loading spinner.
   */
  pending: boolean;

  /**
   * Last error from the most recent `logout()` call, or `null` if the
   * last call succeeded (or no call has been made yet). Reset on next call.
   */
  lastError: Error | null;
}

// ─── Hook ─────────────────────────────────────────────────────

/**
 * Standardized logout flow.
 *
 * @example
 * ```tsx
 * function LogoutButton() {
 *   const { logout, pending } = useLogout();
 *   return (
 *     <button onClick={() => logout()} disabled={pending}>
 *       {pending ? 'Signing out…' : 'Sign out'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @example With confirmation modal
 * ```tsx
 * function ConfirmLogout() {
 *   const { logout, pending } = useLogout();
 *   const closeModal = useUIStore((s) => s.closeModal);
 *   return (
 *     <ModalContent>
 *       <p>Sign out of Datun?</p>
 *       <button onClick={closeModal} disabled={pending}>Cancel</button>
 *       <button onClick={() => logout()} disabled={pending}>
 *         {pending ? 'Signing out…' : 'Sign out'}
 *       </button>
 *     </ModalContent>
 *   );
 * }
 * ```
 */
export function useLogout(): UseLogoutResult {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Read pushToast lazily — calling useUIStore as a hook here would
  // re-render this hook on every UI store change (which is constant).
  // Instead we grab the action reference once via getState (stable).
  const pushToast = useUIStore((s) => s.pushToast);

  const logout = useCallback(async (): Promise<void> => {
    // Idempotency guard — second click during in-flight is a no-op.
    if (pending) return;

    setPending(true);
    setLastError(null);

    let logoutApiError: Error | null = null;

    // Step 1: Backend logout (clears httpOnly refresh cookie).
    try {
      await apiLogout();
    } catch (error) {
      // Network error or 5xx — we proceed with local cleanup anyway.
      // The orphaned cookie expires on its own + the next refresh will fail.
      logoutApiError = error instanceof Error ? error : new Error(String(error));
      // Don't return — local cleanup is more important than perfect
      // backend hygiene for the user-perceived "logged out" state.
    }

    // Step 2: Clear in-memory + storage tokens.
    try {
      clearTokens();
    } catch {
      // clearTokens is best-effort; if it throws, local state still
      // gets wiped in step 3 via resetAllStores.
    }

    // Step 3: Reset Zustand stores (preserves UX prefs per design).
    // `resetAllStores` is sync — doesn't need awaiting.
    resetAllStores();

    // Step 4: Toast feedback to user.
    if (logoutApiError) {
      pushToast({
        variant: 'warning',
        title: 'Signed out locally',
        description:
          'Your session was cleared from this device, but the server may not have received the logout. Restart the app to be fully signed out everywhere.',
        durationMs: 8_000,
      });
      setLastError(logoutApiError);
    } else {
      pushToast({
        variant: 'success',
        title: 'Signed out',
        description: 'You have been signed out of Datun.',
        durationMs: 4_000,
      });
    }

    setPending(false);

    // Step 5: Redirect to login. `router.replace` (not `push`) so the
    // logged-in page isn't in the browser back-stack — the user can't
    // hit Back to "un-logout".
    router.replace('/login');
  }, [pending, router, pushToast]);

  return { logout, pending, lastError };
}
