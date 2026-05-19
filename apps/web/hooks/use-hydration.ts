// ═══════════════════════════════════════════════════════════════
// USE-HYDRATION — DEPRECATED (Task #48 Phase 4 — backward-compat shim)
//
// ⚠ DEPRECATED SINCE: 2026-05-19 (Task #48 completion)
// ⚠ REMOVAL TARGET:   2026-06-19 (30 days)
//
// This hook is preserved as a backward-compatibility shim so existing
// callsites keep compiling. New code MUST use `useStoreHydration` from
// `@/hooks/use-store-hydration` (per-store granular flag) instead.
//
// Why deprecate:
//   The original `useHydration()` returned a boolean that flipped to
//   `true` simply when the React component mounted on the client. It
//   was a DOM-mount marker, NOT a real "stores are hydrated" signal.
//
//   In Phase 1+2 of Task #48 we added persist + encrypted-storage to
//   stores, which made rehydration ASYNC (crypto.subtle.decrypt takes
//   ~5-10ms). So a component using `useHydration()` would unblock its
//   render as soon as it mounted — BEFORE the store's encrypted state
//   had actually loaded. Result: brief flash of "logged out" or empty
//   chat state, then the real state pops in. Bad UX.
//
//   The replacement `useStoreHydration(useStore)` reads a per-store
//   `__hasHydrated: boolean` flag (set by `withHydration` middleware
//   in persist's `onRehydrateStorage` callback). It flips ONLY after
//   the store has actually rehydrated, eliminating the flash.
//
// Migration (one-to-one, takes ~30 seconds per callsite):
//
//   BEFORE:
//     import { useHydration } from '@/hooks/use-hydration';
//     const hydrated = useHydration();
//     if (!hydrated) return <Skeleton />;
//     const user = useAuthStore((s) => s.user);
//
//   AFTER:
//     import { useStoreHydration } from '@/hooks/use-store-hydration';
//     import { useAuthStore } from '@/stores';
//     const hydrated = useStoreHydration(useAuthStore);
//     if (!hydrated) return <Skeleton />;
//     const user = useAuthStore((s) => s.user);
//
//   For multiple stores at once:
//     import { useAllStoresHydrated } from '@/hooks/use-store-hydration';
//     import { useAuthStore, useConsultationStore } from '@/stores';
//     const STORES = [useAuthStore, useConsultationStore] as const;
//     const ready = useAllStoresHydrated(STORES);
//
// Behavior preservation:
//   This shim returns the SAME boolean as the original (DOM-mount marker).
//   It does NOT silently upgrade to per-store gating because that would
//   change render timing in ways callers haven't audited — could mask or
//   create flashes depending on which store the component actually reads.
//
//   The shim's only behavior change is a ONE-TIME dev-mode console warning
//   when the hook is first called per page load. Production builds stay
//   silent (no warning noise in user consoles).
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

/** Module-level flag — ensures the dev warning fires at most once per load. */
let __hasWarnedDeprecated = false;

/**
 * @deprecated Since Task #48 (2026-05-19). Will be removed on 2026-06-19.
 *
 * Use `useStoreHydration(useStore)` from `@/hooks/use-store-hydration`
 * for per-store hydration gating (handles async encrypted/TTL storage
 * correctly), or `useAllStoresHydrated([...stores])` for multi-store gates.
 *
 * See the module header for full migration examples.
 *
 * @returns `true` once the component has mounted on the client. NOTE: this
 *          is a DOM-mount marker, NOT a real "stores rehydrated" signal —
 *          which is exactly why this hook is deprecated.
 *
 * @example Legacy callsite (still works, please migrate)
 * ```tsx
 * const hydrated = useHydration();
 * if (!hydrated) return <Skeleton />;
 * return <Dashboard />;
 * ```
 */
export function useHydration(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // One-time dev-mode warning so engineers know to migrate.
    // Production builds tree-shake this branch via dead-code elimination
    // (Next.js inlines `process.env.NODE_ENV === 'production'` as `false`
    // in dev, so this whole block runs only in dev).
    if (
      process.env.NODE_ENV === 'development' &&
      !__hasWarnedDeprecated &&
      typeof window !== 'undefined'
    ) {
      __hasWarnedDeprecated = true;
      console.warn(
        '[Datun] `useHydration()` is deprecated and will be removed on 2026-06-19. ' +
          'Migrate to `useStoreHydration(useStore)` from `@/hooks/use-store-hydration` ' +
          'for per-store granular gating that handles async storage correctly. ' +
          'See hooks/use-hydration.ts for the migration guide.',
      );
    }

    setHydrated(true);
  }, []);

  return hydrated;
}
