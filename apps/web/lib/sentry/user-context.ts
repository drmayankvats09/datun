// apps/web/lib/sentry/user-context.ts
// ═══════════════════════════════════════════════════════════════
// SENTRY USER CONTEXT — Task #52 Phase 1 (Foundation)
//
// PII-safe bridge between Datun's auth store and Sentry's user
// scope. When an error is captured, Sentry needs SOME correlation
// data to triage it — but in a healthcare app we MUST NOT leak:
//
//   ❌ email      — direct identifier under DPDP & HIPAA
//   ❌ name       — direct identifier
//   ❌ phone      — direct identifier + linkable to OTP records
//   ❌ avatarUrl  — biometric proxy
//   ✅ id         — opaque internal UUID, safe with Sentry's hashing
//   ✅ role       — coarse cardinality (USER / CLINIC / ADMIN), useful
//                    for filtering Sentry issues by audience
//
// Sentry SDK config (`sentry.client.config.ts`) sets
// `sendDefaultPii: false` — but the SDK still respects ANY user
// fields we pass explicitly. So we MUST be the gate: pass only `id`
// and `role`, never the full AuthUser object.
//
// Usage pattern:
//   The AppProvider mounts <SentryUserContext /> once. It silently
//   subscribes to the auth store; on every login / logout / role
//   change it calls Sentry.setUser. No JSX, no DOM, no re-render
//   overhead — pure side-effect coordination.
//
// References:
//   - https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/sensitive-data/
//   - HIPAA Security Rule §164.514 (de-identification standard)
//   - DPDP Act 2023, Section 8(3) (data minimisation)
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useRef } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useAuthStore } from '@/stores';
import type { AuthUser } from '@repo/shared';

// ─── PII-safe user shape ───────────────────────────────────────

/**
 * The whitelist of AuthUser fields that may flow to Sentry. Defined
 * separately so a future schema addition (e.g., `clinicId`) requires
 * an explicit decision here rather than silently leaking.
 */
interface SentryUserSafeFields {
  /** Opaque UUID — safe correlation identifier. */
  readonly id: string;
  /** Coarse role string — used as tag, NOT as `Sentry.User.id`. */
  readonly role: string;
}

/**
 * Extract the PII-safe subset of an AuthUser. Pure function; testable.
 */
function toSentrySafe(user: AuthUser | null): SentryUserSafeFields | null {
  if (!user) return null;
  return { id: user.id, role: user.role };
}

// ─── Sentry application ────────────────────────────────────────

/**
 * Apply the user state to Sentry's scope. Idempotent — calling with
 * the same payload twice is a no-op as far as Sentry is concerned.
 *
 * Behaviour:
 *   - Logged in:  Sentry.setUser({ id })  +  Sentry.setTag('user.role', role)
 *   - Logged out: Sentry.setUser(null)    +  removes the role tag
 *
 * Why `role` is a TAG, not a user field:
 *   - Tags are indexed for filtering ("show me all USER errors")
 *   - Keeping it out of the user object reinforces "id is the ONLY
 *     identifier" discipline.
 */
function applyToSentry(safe: SentryUserSafeFields | null): void {
  if (safe) {
    Sentry.setUser({ id: safe.id });
    Sentry.setTag('user.role', safe.role);
  } else {
    Sentry.setUser(null);
    // Sentry doesn't expose `removeTag`; setTag(undefined) is the
    // documented mechanism for clearing.
    Sentry.setTag('user.role', undefined as unknown as string);
  }
}

// ─── React integration ─────────────────────────────────────────

/**
 * Subscribe Sentry's user scope to the auth store. Mount ONCE near
 * the app root (inside AppProvider, after the auth store has had a
 * chance to hydrate).
 *
 * Renders nothing — purely a side-effect coordination component.
 *
 * Implementation detail:
 *   - We use `useAuthStore.subscribe` (Zustand's external API) rather
 *     than `useAuthStore(selector)` to avoid coupling re-renders to
 *     unrelated parts of the auth state (e.g., `isLoading` toggling).
 *   - On mount, we read the current state synchronously to handle
 *     the case where the user already exists at first paint
 *     (Zustand's persist middleware rehydrates on mount).
 *
 * @example
 *   function AppProvider({ children }) {
 *     return (
 *       <>
 *         <SentryUserContext />
 *         {children}
 *       </>
 *     )
 *   }
 */
export function SentryUserContext(): null {
  // `appliedRef` deduplicates redundant Sentry.setUser calls when the
  // store emits a change but the user-relevant subset is unchanged
  // (e.g., `isLoading` toggling while `user` stays the same).
  const appliedRef = useRef<SentryUserSafeFields | null>(null);

  useEffect(() => {
    // ── Initial sync — handle hydrated state at first paint ──
    const initialUser = useAuthStore.getState().user;
    const initialSafe = toSentrySafe(initialUser);
    if (!shallowEqual(appliedRef.current, initialSafe)) {
      applyToSentry(initialSafe);
      appliedRef.current = initialSafe;
    }

    // ── Subscribe to subsequent changes ──
    const unsubscribe = useAuthStore.subscribe((state) => {
      const nextSafe = toSentrySafe(state.user);
      if (shallowEqual(appliedRef.current, nextSafe)) return;
      applyToSentry(nextSafe);
      appliedRef.current = nextSafe;
    });

    return () => {
      unsubscribe();
      // On unmount (extremely rare — app provider lives forever in
      // practice), clear the Sentry user to avoid leaking past identity
      // into future captures if the component remounts later.
      Sentry.setUser(null);
      appliedRef.current = null;
    };
  }, []);

  return null;
}

/**
 * Shallow-equal for the SentryUserSafeFields shape. Exported for tests.
 */
export function shallowEqual(
  a: SentryUserSafeFields | null,
  b: SentryUserSafeFields | null,
): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  return a.id === b.id && a.role === b.role;
}

// ─── Imperative API (for non-React call sites) ─────────────────

/**
 * Imperatively apply a user to Sentry. Useful for tests, scripts,
 * and ONE-OFF call sites (e.g., a logout button that wants to clear
 * Sentry user before navigating). Hooks should prefer the
 * <SentryUserContext /> component above.
 */
export function setSentryUser(user: AuthUser | null): void {
  applyToSentry(toSentrySafe(user));
}
