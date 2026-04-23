// ═══════════════════════════════════════════════════════════════
// STORAGE UTILITIES — Health check + safe access + quota guard
// Pattern: Google/Stripe — never assume localStorage works.
// India reality: iOS Safari evicts localStorage in low-storage.
// Old phones, WebView, incognito — all can fail silently.
// ═══════════════════════════════════════════════════════════════

/**
 * Check if localStorage is available and writable.
 * Returns false in: incognito Safari, old WebViews, disabled cookies,
 * quota exceeded, iframe sandboxed.
 */
export function isLocalStorageAvailable(): boolean {
  const testKey = '__datun_storage_test__';
  try {
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get remaining localStorage quota in bytes (approximate).
 * Most browsers give 5-10MB. iOS Safari can evict without warning.
 */
export function getStorageUsage(): { usedBytes: number; estimatedLimitBytes: number } {
  let usedBytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        usedBytes += (localStorage.getItem(key)?.length ?? 0) * 2; // UTF-16
      }
    }
  } catch {
    // Access denied
  }
  return { usedBytes, estimatedLimitBytes: 5 * 1024 * 1024 }; // 5MB conservative
}

/**
 * Safe localStorage wrapper — never throws, returns null on failure.
 * Use this instead of raw localStorage in non-Zustand code.
 */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      // Quota exceeded or access denied
      console.warn(`[Storage] Failed to set key "${key}" — quota may be exceeded`);
      return false;
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  },
};

/**
 * Create a safe JSON storage adapter for Zustand persist.
 * Falls back to in-memory Map if localStorage is unavailable.
 * Prevents crash on iOS Safari eviction / incognito / WebView.
 */
export function createSafeStorage() {
  if (typeof window === 'undefined') {
    // SSR — return noop storage
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  const available = isLocalStorageAvailable();

  if (available) {
    return {
      getItem: (name: string) => {
        try {
          return localStorage.getItem(name);
        } catch {
          return null;
        }
      },
      setItem: (name: string, value: string) => {
        try {
          localStorage.setItem(name, value);
        } catch {
          console.warn(`[Storage] Quota exceeded writing "${name}"`);
        }
      },
      removeItem: (name: string) => {
        try {
          localStorage.removeItem(name);
        } catch {
          // Silently fail
        }
      },
    };
  }

  // Fallback: in-memory storage (data lost on reload, but app doesn't crash)
  const memoryStore = new Map<string, string>();
  console.warn('[Storage] localStorage unavailable — using in-memory fallback');

  return {
    getItem: (name: string) => memoryStore.get(name) ?? null,
    setItem: (name: string, value: string) => memoryStore.set(name, value),
    removeItem: (name: string) => memoryStore.delete(name),
  };
}
