// ═══════════════════════════════════════════════════════════════
// AUTH CLIENT TESTS — Token CRUD + SSR safety + quota handling
// Tests the foundation that ALL auth flows depend on.
// Pattern: Clerk SDK tests, Supabase JS client tests.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isLoggedIn,
} from '../../lib/auth';

describe('Auth Token Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── getAccessToken ──

  it('returns null when no token stored', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('returns stored access token', () => {
    localStorage.setItem('datun_access_token', 'test-access-123');
    expect(getAccessToken()).toBe('test-access-123');
  });

  // ── getRefreshToken ──

  it('returns null when no refresh token stored', () => {
    expect(getRefreshToken()).toBeNull();
  });

  it('returns stored refresh token', () => {
    localStorage.setItem('datun_refresh_token', 'test-refresh-456');
    expect(getRefreshToken()).toBe('test-refresh-456');
  });

  // ── setTokens ──

  it('stores both tokens in localStorage', () => {
    setTokens('access-abc', 'refresh-xyz');
    expect(localStorage.getItem('datun_access_token')).toBe('access-abc');
    expect(localStorage.getItem('datun_refresh_token')).toBe('refresh-xyz');
  });

  it('overwrites existing tokens', () => {
    setTokens('old-access', 'old-refresh');
    setTokens('new-access', 'new-refresh');
    expect(localStorage.getItem('datun_access_token')).toBe('new-access');
    expect(localStorage.getItem('datun_refresh_token')).toBe('new-refresh');
  });

  it('handles localStorage quota error gracefully (iOS Safari)', () => {
    // Simulate QuotaExceededError
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn(() => {
      throw new DOMException('QuotaExceededError');
    });

    // Should NOT throw — graceful degradation
    expect(() => setTokens('x', 'y')).not.toThrow();

    localStorage.setItem = originalSetItem;
  });

  // ── clearTokens ──

  it('removes both tokens from localStorage', () => {
    setTokens('access', 'refresh');
    clearTokens();
    expect(localStorage.getItem('datun_access_token')).toBeNull();
    expect(localStorage.getItem('datun_refresh_token')).toBeNull();
  });

  it('does not throw when clearing non-existent tokens', () => {
    expect(() => clearTokens()).not.toThrow();
  });

  // ── isLoggedIn ──

  it('returns false when no access token', () => {
    expect(isLoggedIn()).toBe(false);
  });

  it('returns true when access token exists', () => {
    setTokens('valid-token', 'refresh');
    expect(isLoggedIn()).toBe(true);
  });

  it('returns false after clearTokens', () => {
    setTokens('token', 'refresh');
    clearTokens();
    expect(isLoggedIn()).toBe(false);
  });
});
