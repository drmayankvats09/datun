// ═══════════════════════════════════════════════════════════════
// AUTH STORE — Reactive user state with persistence + devtools
// Tokens in lib/auth.ts (security). Store = user profile + UI state.
// Pattern: Clerk/Supabase — auth lib handles tokens, store = UI.
//
// ADVANCED:
// - DevTools integration (Redux DevTools Extension in dev)
// - Cross-tab logout sync (BroadcastChannel API)
// - Safe storage (survives iOS Safari eviction)
// - Version migration (future schema changes)
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { createSafeStorage } from '@/lib/storage';
import type { AuthUser } from '@/lib/auth';

// ── Cross-tab sync channel ──
const AUTH_CHANNEL_NAME = 'datun-auth-sync';

// ── Types ──

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  lastSyncedAt: number | null;

  setUser: (user: AuthUser) => void;
  setLoading: (loading: boolean) => void;
  clearUser: () => void;
  updateUser: (partial: Partial<AuthUser>) => void;
}

// ── Store ──

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isLoading: true,
        lastSyncedAt: null,

        setUser: (user) => {
          set({ user, isLoading: false, lastSyncedAt: Date.now() }, false, 'auth/setUser');
          // P3-F3: Don't re-broadcast if this was triggered by another tab's broadcast
          if (typeof window !== 'undefined' && sessionStorage.getItem('datun-cross-tab-reload')) {
            sessionStorage.removeItem('datun-cross-tab-reload');
            return;
          }
          broadcastAuthEvent('login');
        },

        setLoading: (isLoading) => set({ isLoading }, false, 'auth/setLoading'),

        clearUser: () => {
          set({ user: null, isLoading: false, lastSyncedAt: null }, false, 'auth/clearUser');
          // Notify other tabs: user logged out
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
      {
        name: 'datun-auth',
        version: 1,
        storage: createJSONStorage(() => createSafeStorage()),

        // SECURITY: Only persist non-sensitive fields (no tokens)
        partialize: (state) => ({
          user: state.user,
          lastSyncedAt: state.lastSyncedAt,
        }),

        migrate: (persisted, version) => {
          if (version === 0) {
            return { ...(persisted as Record<string, unknown>), lastSyncedAt: null };
          }
          return persisted as AuthState;
        },
      },
    ),
    { name: 'AuthStore', enabled: process.env.NODE_ENV === 'development' },
  ),
);

// ── Cross-tab sync ──

function broadcastAuthEvent(type: 'login' | 'logout') {
  try {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    channel.postMessage({ type, timestamp: Date.now() });
    channel.close();
  } catch {
    // BroadcastChannel not supported — silently degrade
  }
}

/**
 * Listen for auth events from other tabs.
 * Call this ONCE in app shell. Returns cleanup function.
 */
export function listenCrossTabAuth(): () => void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return () => {};
  }

  const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);

  channel.onmessage = (event) => {
    const { type, timestamp } = event.data as { type: 'login' | 'logout'; timestamp: number };

    // P3-F3: Ignore stale messages (>5s old)
    if (Date.now() - timestamp > 5000) return;

    if (type === 'logout') {
      // Clear state WITHOUT re-broadcasting (prevents loop)
      useAuthStore.setState({ user: null, isLoading: false, lastSyncedAt: null });
      window.location.href = '/login';
    }
    if (type === 'login') {
      // P3-F3: Mark this as cross-tab originated to prevent re-broadcast
      sessionStorage.setItem('datun-cross-tab-reload', '1');
      window.location.reload();
    }
  };

  return () => channel.close();
}
