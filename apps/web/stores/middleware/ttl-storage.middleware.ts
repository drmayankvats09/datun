// ═══════════════════════════════════════════════════════════════
// TTL STORAGE — Time-to-live wrapper for any StateStorage
//
// Wraps any `StateStorage` (localStorage, sessionStorage, IndexedDB)
// and automatically expires keys after a configurable duration.
//
// Why we need TTL:
// - Intake drafts older than 24h are stale (different patient session).
// - Cached consultation messages older than 7d are pointless — backend
//   already has the authoritative copy, fetching is fast.
// - iOS Safari has a 5MB localStorage cap; on overflow it evicts
//   silently. We want OUR data to expire predictably before then.
// - DPDP "data minimization" principle: don't retain PII longer than
//   strictly needed.
//
// Implementation details:
// - Metadata (expiry timestamp) stored in a SIBLING key
//   (`<key>::__expires_at`) so the actual persisted state JSON is
//   untouched by this wrapper. Decouples TTL from state shape — works
//   with any persist version + any future state migrations.
// - Lazy expiry: checked on read. If expired, both keys are removed
//   and `getItem` returns `null` (Zustand persist's default-state
//   path kicks in — same UX as a brand-new user).
// - No setInterval / no scheduled GC: keeps the bundle dumb and
//   predictable. Cleanup happens whenever the user opens the app.
// - Async-safe: all base storage calls are wrapped in `Promise.resolve`
//   so the wrapper works with both sync (localStorage) and async
//   (IndexedDB, encrypted) backends.
// ═══════════════════════════════════════════════════════════════

import type { StateStorage } from 'zustand/middleware';

/** Suffix appended to the data key to form the metadata key. */
const METADATA_SUFFIX = '::__expires_at' as const;

export interface TTLStorageOptions {
  /**
   * Maximum age in milliseconds. After this many ms past the most recent
   * write, the entry is considered expired and `getItem` returns null.
   *
   * Common values:
   *   - 1 hour       = 60 * 60 * 1000
   *   - 24 hours     = 24 * 60 * 60 * 1000
   *   - 7 days       = 7 * 24 * 60 * 60 * 1000
   *   - 30 days      = 30 * 24 * 60 * 60 * 1000
   */
  ttlMs: number;
  /**
   * Optional clock override — primarily for unit tests so they can
   * advance "now" without `vi.useFakeTimers()`. Defaults to `Date.now`.
   */
  now?: () => number;
}

/**
 * Wrap a base storage with TTL (time-to-live) expiry.
 *
 * @param base - Underlying StateStorage (typically `createSafeStorage()`)
 * @param options - TTL configuration
 * @returns A new StateStorage that transparently expires stale entries
 *
 * @example 24-hour TTL for intake draft
 * ```ts
 * import { createSafeStorage } from '@/lib/storage';
 * import { createTTLStorage } from './middleware';
 *
 * const intakeStorage = createTTLStorage(createSafeStorage(), {
 *   ttlMs: 24 * 60 * 60 * 1000,
 * });
 *
 * // Use with Zustand persist:
 * persist(initializer, {
 *   name: 'datun-consultation',
 *   storage: createJSONStorage(() => intakeStorage),
 * });
 * ```
 */
export function createTTLStorage(base: StateStorage, options: TTLStorageOptions): StateStorage {
  const now = options.now ?? (() => Date.now());

  return {
    /**
     * Read with expiry check. Returns:
     * - The stored value if present and not expired
     * - The stored value if present but missing metadata (legacy entry)
     * - `null` if missing, expired, or metadata corrupted
     */
    getItem: async (name) => {
      const value = await Promise.resolve(base.getItem(name));
      if (value === null) return null;

      const expiresRaw = await Promise.resolve(base.getItem(`${name}${METADATA_SUFFIX}`));

      // No metadata → legacy entry from before TTL was enabled,
      // OR base storage doesn't preserve the sibling key reliably.
      // Treat as non-expiring; metadata will be (re)written on next setItem.
      if (expiresRaw === null) {
        return value;
      }

      const expiresAt = Number(expiresRaw);

      // Corrupted metadata (non-numeric) → safest assumption: purge.
      if (!Number.isFinite(expiresAt)) {
        await Promise.resolve(base.removeItem(name));
        await Promise.resolve(base.removeItem(`${name}${METADATA_SUFFIX}`));
        return null;
      }

      if (now() > expiresAt) {
        // Expired — purge both keys and return null.
        await Promise.resolve(base.removeItem(name));
        await Promise.resolve(base.removeItem(`${name}${METADATA_SUFFIX}`));
        return null;
      }

      return value;
    },

    /**
     * Write value + metadata atomically (best-effort — neither base
     * storage guarantees atomicity, but writes are sequential so a
     * partial write would only result in a missing-metadata entry,
     * which our getItem handles gracefully).
     */
    setItem: async (name, value) => {
      const expiresAt = now() + options.ttlMs;
      await Promise.resolve(base.setItem(name, value));
      await Promise.resolve(base.setItem(`${name}${METADATA_SUFFIX}`, String(expiresAt)));
    },

    /** Remove value + metadata. */
    removeItem: async (name) => {
      await Promise.resolve(base.removeItem(name));
      await Promise.resolve(base.removeItem(`${name}${METADATA_SUFFIX}`));
    },
  };
}
