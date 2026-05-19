// ═══════════════════════════════════════════════════════════════
// USE-STORE-HYDRATION — Per-store hydration gating hook
//
// Reads the `__hasHydrated` flag (added by `withHydration` middleware
// in Phase 1) from one or more Zustand stores. Components use this to
// hold rendering until the persisted state has loaded — preventing the
// SSR ↔ client mismatch flash.
//
// Why per-store (vs the existing global `useHydration` boolean):
//   - Auth store may hydrate at t=80ms (sync localStorage path).
//   - Consultation store with encrypted-storage may hydrate at t=250ms
//     (async crypto.subtle.decrypt).
//   - A global "dom-mounted" flag flips at one of those times, leaving
//     the other store still showing stale defaults during the gap.
//   - Per-store flag = surgical control. Components wait for the
//     specific store(s) they read, no false positives, no flashes.
//
// Composable: `useStoreHydration(useAuthStore)` for single-store gating,
// `useAllStoresHydrated([useAuthStore, useConsultationStore])` for
// multi-store layout components.
//
// Pattern source: Zustand official docs § "How can I check if my store
// has been hydrated?" + Vercel Next.js + Zustand example. Standard
// 2026 React app architecture.
// ═══════════════════════════════════════════════════════════════

import { useSyncExternalStore } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { WithHydration } from '@/stores/types';

// ─── Types ────────────────────────────────────────────────────

/**
 * A Zustand bound store hook that includes hydration tracking.
 * The store's state must extend `WithHydration` (i.e., the store was
 * created using Phase 1's `withHydration` + `createHydrationState`).
 */
type HydratableStore<S extends WithHydration> = UseBoundStore<StoreApi<S>>;

// ─── Single-store hydration reader ────────────────────────────

/**
 * Subscribe to a single store's hydration flag.
 *
 * Returns `true` once the store has rehydrated from storage (success
 * OR failure — a failed hydration is still a completed attempt; the
 * component should render with default state rather than wait forever).
 *
 * SSR-safe: returns `false` during server rendering and on the first
 * client render (avoiding mismatch errors), then flips to `true` on
 * the first commit when persist has resolved.
 *
 * @example Gate a profile component on the auth store
 * ```tsx
 * import { useAuthStore } from '@/stores';
 * import { useStoreHydration } from '@/hooks/use-store-hydration';
 *
 * export function ProfilePanel() {
 *   const hydrated = useStoreHydration(useAuthStore);
 *   const user = useAuthStore((s) => s.user);
 *
 *   if (!hydrated) return <ProfileSkeleton />;
 *   if (!user) return <LoggedOutState />;
 *   return <ProfileDetails user={user} />;
 * }
 * ```
 *
 * @param store - Any Zustand store created with Phase 1's withHydration
 * @returns `true` once the store has rehydrated; `false` until then.
 */
export function useStoreHydration<S extends WithHydration>(store: HydratableStore<S>): boolean {
  // useSyncExternalStore is React 18+ official primitive for subscribing
  // to external mutable sources. It handles tearing safely under
  // concurrent rendering and gives us a clean SSR snapshot via the
  // third arg.
  return useSyncExternalStore(
    // Subscribe — Zustand store API returns a teardown function on subscribe.
    (onChange) =>
      store.subscribe((curr, prev) => {
        // Only re-render if the hydration flag actually changed; everything
        // else in the store can churn without re-rendering hydration consumers.
        if (curr.__hasHydrated !== prev.__hasHydrated) onChange();
      }),
    // Client snapshot — read directly from store state.
    () => store.getState().__hasHydrated,
    // SSR snapshot — always false on the server (no localStorage to hydrate from).
    () => false,
  );
}

// ─── Multi-store hydration reader ─────────────────────────────

/**
 * Subscribe to multiple stores' hydration flags and return `true`
 * only when ALL of them have rehydrated.
 *
 * Useful for layout-level gates that read from multiple stores at once
 * (e.g., dashboard pages that need both auth AND consultation state).
 *
 * Note: returns `true` when all flags are `true` — it does NOT recompute
 * if you pass a NEW array of stores on each render. Memoize the array
 * argument with `useMemo` if your store list is dynamic (rare).
 *
 * @example Gate a dashboard on both auth + consultation hydration
 * ```tsx
 * import { useAuthStore, useConsultationStore } from '@/stores';
 * import { useAllStoresHydrated } from '@/hooks/use-store-hydration';
 *
 * const STORES = [useAuthStore, useConsultationStore] as const;
 *
 * export function Dashboard() {
 *   const ready = useAllStoresHydrated(STORES);
 *   if (!ready) return <DashboardSkeleton />;
 *   return <DashboardContent />;
 * }
 * ```
 *
 * @param stores - Array of Zustand stores to wait on
 * @returns `true` only when every store reports `__hasHydrated: true`
 */
export function useAllStoresHydrated(
  stores: ReadonlyArray<HydratableStore<WithHydration>>,
): boolean {
  return useSyncExternalStore(
    (onChange) => {
      // Subscribe to every store; emit a change when ANY flag changes.
      const unsubs = stores.map((store) =>
        store.subscribe((curr, prev) => {
          if (curr.__hasHydrated !== prev.__hasHydrated) onChange();
        }),
      );
      // Composite cleanup — unsubscribe from every store on teardown.
      return () => unsubs.forEach((u) => u());
    },
    () => stores.every((s) => s.getState().__hasHydrated),
    () => false,
  );
}
