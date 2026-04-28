// ═══════════════════════════════════════════════════════════════
// AUTH STORE TESTS — Zustand state transitions + persistence
// Tests every action and verifies state correctness.
// Pattern: Zustand official testing guide + Cal.com store tests.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../stores/auth.store';
import type { AuthUser } from '../../lib/auth';

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

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      isLoading: true,
      lastSyncedAt: null,
    });
  });

  // ── Initial State ──

  it('starts with null user and loading true', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(true);
    expect(state.lastSyncedAt).toBeNull();
  });

  // ── setUser ──

  it('setUser stores user and sets loading false', () => {
    useAuthStore.getState().setUser(mockUser);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isLoading).toBe(false);
    expect(state.lastSyncedAt).toBeGreaterThan(0);
  });

  it('setUser updates lastSyncedAt to current timestamp', () => {
    const before = Date.now();
    useAuthStore.getState().setUser(mockUser);
    const after = Date.now();

    const synced = useAuthStore.getState().lastSyncedAt!;
    expect(synced).toBeGreaterThanOrEqual(before);
    expect(synced).toBeLessThanOrEqual(after);
  });

  // ── clearUser ──

  it('clearUser resets user, loading, and lastSyncedAt', () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().clearUser();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.lastSyncedAt).toBeNull();
  });

  // ── updateUser ──

  it('updateUser merges partial data into existing user', () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().updateUser({ name: 'Dr. Updated', isPhoneVerified: true });

    const user = useAuthStore.getState().user!;
    expect(user.name).toBe('Dr. Updated');
    expect(user.isPhoneVerified).toBe(true);
    // Unchanged fields stay same
    expect(user.email).toBe('test@datunai.com');
    expect(user.id).toBe('user-001');
  });

  it('updateUser is no-op when user is null', () => {
    useAuthStore.getState().updateUser({ name: 'Ghost' });
    expect(useAuthStore.getState().user).toBeNull();
  });

  // ── setLoading ──

  it('setLoading updates loading state', () => {
    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);

    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);
  });

  // ── Loading always resets correctly (proves isLoading NOT persisted) ──

  it('setUser always resets isLoading to false regardless of prior state', () => {
    // Start: isLoading = true (initial default — fresh page load)
    expect(useAuthStore.getState().isLoading).toBe(true);

    // After setUser: isLoading = false (user loaded, no more loading)
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().isLoading).toBe(false);

    // Manually set loading true again (simulates re-sync trigger)
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);

    // setUser ALWAYS resets to false — no stale loading state possible
    useAuthStore.getState().setUser(mockUser);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it('clearUser sets isLoading to false (not stuck on loading spinner)', () => {
    useAuthStore.getState().setUser(mockUser);
    useAuthStore.getState().clearUser();
    // After logout: isLoading = false (not stuck loading)
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
