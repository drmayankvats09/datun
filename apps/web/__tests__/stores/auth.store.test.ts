// ═══════════════════════════════════════════════════════════════
// AUTH STORE TESTS — State transitions + cross-tab guard + hydration
//
// Phase 3 extends the original test suite:
//   - All original action tests (setUser, setLoading, clearUser, updateUser)
//   - NEW: __hasHydrated initial state assertion
//   - NEW: Cross-tab loop guard (sessionStorage flag prevents re-broadcast)
//   - NEW: BroadcastChannel mock to verify broadcast on login/logout
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuthStore } from '../../stores/auth.store';
import type { AuthUser } from '../../lib/auth';

// ─── Fixtures ────────────────────────────────────────────────

const mockUser: AuthUser = {
  id: 'user-001',
  email: 'test@datunai.com',
  name: 'Dr. Test',
  phone: '+919876543210',
  avatarUrl: null,
  role: 'PATIENT',
  isEmailVerified: true,
  isPhoneVerified: false,
};

// ─── BroadcastChannel mock — captures posted messages ─────────

interface CapturedPost {
  channel: string;
  data: unknown;
}

let capturedPosts: CapturedPost[] = [];

class MockBroadcastChannel {
  constructor(public name: string) {}
  postMessage(data: unknown): void {
    capturedPosts.push({ channel: this.name, data });
  }
  close(): void {
    /* no-op */
  }
  onmessage: ((event: MessageEvent) => void) | null = null;
}

beforeEach(() => {
  capturedPosts = [];
  // Install BroadcastChannel mock into global scope.
  (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = MockBroadcastChannel;

  // Reset store to initial state.
  useAuthStore.setState({
    user: null,
    isLoading: true,
    lastSyncedAt: null,
    __hasHydrated: false,
  });
});

afterEach(() => {
  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  vi.restoreAllMocks();
});

// ─── Initial state ───────────────────────────────────────────

describe('Auth Store — Initial state', () => {
  it('starts with null user, loading true, no last sync', () => {
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.isLoading).toBe(true);
    expect(s.lastSyncedAt).toBeNull();
  });

  it('starts with __hasHydrated false', () => {
    expect(useAuthStore.getState().__hasHydrated).toBe(false);
  });

  it('exposes a __setHasHydrated setter function', () => {
    const { __setHasHydrated } = useAuthStore.getState();
    expect(typeof __setHasHydrated).toBe('function');
    __setHasHydrated(true);
    expect(useAuthStore.getState().__hasHydrated).toBe(true);
  });
});

// ─── setUser ─────────────────────────────────────────────────

describe('Auth Store — setUser', () => {
  it('stores user and sets loading false + lastSyncedAt now', () => {
    const before = Date.now();
    useAuthStore.getState().setUser(mockUser);
    const s = useAuthStore.getState();
    expect(s.user).toEqual(mockUser);
    expect(s.isLoading).toBe(false);
    expect(s.lastSyncedAt).toBeGreaterThanOrEqual(before);
  });

  it('broadcasts login event to other tabs', () => {
    useAuthStore.getState().setUser(mockUser);
    expect(capturedPosts).toHaveLength(1);
    expect(capturedPosts[0]!.channel).toBe('datun-auth-sync');
    expect((capturedPosts[0]!.data as { type: string }).type).toBe('login');
  });

  it('does NOT broadcast if cross-tab reload flag is set (loop guard)', () => {
    // Simulate: another tab broadcast a login, this tab reloaded, and
    // its post-reload hydration is now calling setUser. The flag was
    // pre-set by the cross-tab handler so we skip re-broadcast.
    sessionStorage.setItem('datun-cross-tab-reload', '1');
    useAuthStore.getState().setUser(mockUser);
    expect(capturedPosts).toHaveLength(0);
    // Flag should be cleared after consumption.
    expect(sessionStorage.getItem('datun-cross-tab-reload')).toBeNull();
  });
});

// ─── clearUser ───────────────────────────────────────────────

describe('Auth Store — clearUser', () => {
  it('wipes user + loading + lastSyncedAt', () => {
    useAuthStore.setState({
      user: mockUser,
      isLoading: false,
      lastSyncedAt: Date.now(),
    });
    useAuthStore.getState().clearUser();
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.isLoading).toBe(false);
    expect(s.lastSyncedAt).toBeNull();
  });

  it('broadcasts logout event to other tabs', () => {
    useAuthStore.getState().clearUser();
    expect(capturedPosts).toHaveLength(1);
    expect((capturedPosts[0]!.data as { type: string }).type).toBe('logout');
  });
});

// ─── setLoading ──────────────────────────────────────────────

describe('Auth Store — setLoading', () => {
  it('toggles the loading flag', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
  });

  it('does NOT broadcast (loading is local-only state)', () => {
    useAuthStore.getState().setLoading(false);
    expect(capturedPosts).toHaveLength(0);
  });
});

// ─── updateUser ──────────────────────────────────────────────

describe('Auth Store — updateUser', () => {
  it('merges partial fields into the existing user', () => {
    useAuthStore.setState({ user: mockUser });
    useAuthStore.getState().updateUser({ name: 'Dr. Updated' });
    const s = useAuthStore.getState();
    expect(s.user?.name).toBe('Dr. Updated');
    expect(s.user?.email).toBe(mockUser.email);
    expect(s.user?.id).toBe(mockUser.id);
  });

  it('is a no-op when no user is logged in', () => {
    useAuthStore.getState().updateUser({ name: 'Ghost' });
    expect(useAuthStore.getState().user).toBeNull();
  });
});
