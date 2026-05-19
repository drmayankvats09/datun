// ═══════════════════════════════════════════════════════════════
// WITH-HYDRATION HELPER — Per-store hydration flag pattern
//
// Adds a `__hasHydrated: boolean` flag to any persist-enabled store.
// Components read this flag via `useStoreHydration(useStore)` (Phase 2)
// to gate rendering until persisted state has loaded from storage.
//
// Why per-store flag (vs the existing global `useHydration()` hook):
// - Auth store may rehydrate at t=80ms (sync localStorage path).
//   Consultation store with encrypted-storage may rehydrate at t=250ms
//   (async crypto.subtle.decrypt). A global flag flips at one of those
//   times; the other store still shows stale defaults during that gap.
// - Per-store flag = surgical control. Each consumer waits for the
//   specific store(s) it cares about, no false positives, no flashes.
//
// Pattern source: Zustand official docs §"How can I check if my store
// has been hydrated?" + Vercel Next.js + Zustand official example.
//
// Why a helper (vs a true Zustand middleware):
// - The `__hasHydrated` flag must be in the STATE shape (not stored
//   separately) so React selectors re-render when it flips.
// - Persist's `onRehydrateStorage` callback is the canonical injection
//   point. Wrapping persist as a middleware would re-implement persist;
//   a helper that augments persist options is simpler and equivalent.
// ═══════════════════════════════════════════════════════════════

import type { PersistOptions } from 'zustand/middleware';
import type { WithHydration } from '../types';

/**
 * Augment a persist options object so the store gains a `__hasHydrated`
 * flag that flips to `true` once persisted state has loaded into memory.
 *
 * The user's own `onRehydrateStorage` callback (if provided) is COMPOSED:
 * it runs AFTER our hydration flag is set, so user code can synchronously
 * read fully-rehydrated state inside the callback.
 *
 * Usage in a store:
 * ```ts
 * import { create } from 'zustand';
 * import { persist, devtools, createJSONStorage } from 'zustand/middleware';
 * import { createSafeStorage } from '@/lib/storage';
 * import { withHydration, createHydrationState } from './middleware';
 *
 * interface MyState extends WithHydration {
 *   count: number;
 *   increment: () => void;
 * }
 *
 * export const useMyStore = create<MyState>()(
 *   devtools(
 *     persist(
 *       (set, get) => ({
 *         ...createHydrationState<MyState>(set),
 *         count: 0,
 *         increment: () => set((s) => ({ count: s.count + 1 }), false, 'inc'),
 *       }),
 *       withHydration({
 *         name: 'my-store',
 *         storage: createJSONStorage(() => createSafeStorage()),
 *       }),
 *     ),
 *   ),
 * );
 * ```
 *
 * @typeParam T - Store state shape (must extend WithHydration)
 * @typeParam U - Partialized persist shape (defaults to Partial<T>)
 * @param config - Base persist options (must include `name`)
 * @returns Persist options with hydration tracking layered in
 */
export function withHydration<T extends WithHydration, U = Partial<T>>(
  config: PersistOptions<T, U>,
): PersistOptions<T, U> {
  const userOnRehydrate = config.onRehydrateStorage;

  return {
    ...config,
    onRehydrateStorage: (state) => {
      // Call the user's "start" callback synchronously, capturing the
      // optional "finish" callback they return (if any).
      const userFinishCallback = userOnRehydrate?.(state);

      // Return our composed "finish" callback (called by Zustand after
      // rehydration completes, with the rehydrated state or an error).
      return (rehydratedState, error) => {
        // Flip __hasHydrated to true REGARDLESS of success/error.
        // A failed hydration is still a completed attempt — components
        // should stop showing skeletons and render with default state.
        if (rehydratedState) {
          rehydratedState.__hasHydrated = true;
        }

        // Compose with the user's finish callback (if they provided one).
        if (typeof userFinishCallback === 'function') {
          userFinishCallback(rehydratedState, error);
        }
      };
    },
  };
}

/**
 * Generate the initial-state fields a store needs to satisfy `WithHydration`.
 *
 * Spread the result of this factory into your `create()` initializer to
 * get both the `__hasHydrated: false` initial flag AND the typed setter
 * function in one go — no risk of forgetting to wire up the setter.
 *
 * @example
 * ```ts
 * create<MyState>()(persist((set, get) => ({
 *   ...createHydrationState<MyState>(set),
 *   // ... rest of your state and actions
 * }), withHydration({ name: 'my-store' })));
 * ```
 *
 * @typeParam T - The full store state shape (extends WithHydration)
 * @param set - Zustand's `set` function (from inside create initializer)
 * @returns Object with `__hasHydrated: false` and `__setHasHydrated` setter
 */
export function createHydrationState<T extends WithHydration>(
  set: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: false, action?: string) => void,
): WithHydration {
  return {
    __hasHydrated: false,
    __setHasHydrated: (value: boolean) => {
      set({ __hasHydrated: value } as Partial<T>, false, 'hydration/set');
    },
  };
}
