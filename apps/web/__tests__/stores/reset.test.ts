// ═══════════════════════════════════════════════════════════════
// RESET TESTS — Cross-store cleanup utilities
//
// Tests the two reset functions:
//   - resetAllStores: logout flow, PRESERVES UX preferences
//   - hardResetAllStores: account deletion, wipes EVERYTHING
//
// Key distinction:
//   resetAllStores PRESERVES:
//     - welcomeBannerDismissed (no re-show onboarding)
//     - consultationSortOrder (sticky preference)
//   hardResetAllStores WIPES the above too.
//
// Also tests: idempotency, localStorage key removal in hardReset.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetAllStores, hardResetAllStores } from '../../stores/reset';
import { useAuthStore } from '../../stores/auth.store';
import { useConsultationStore } from '../../stores/consultation.store';
import { useUIStore } from '../../stores/ui.store';
import type { AuthUser } from '../../lib/auth';

const mockUser: AuthUser = {
  id: 'u-1',
  email: 'a@b.com',
  name: 'Test',
  phone: null,
  avatarUrl: null,
  role: 'PATIENT',
  isEmailVerified: true,
  isPhoneVerified: false,
};

// ─── BroadcastChannel mock — clearUser broadcasts on logout ──

class MockBroadcastChannel {
  constructor(public name: string) {}
  postMessage(): void {
    /* no-op — mock ignores the payload */
  }
  close(): void {
    /* no-op */
  }
  onmessage: ((event: MessageEvent) => void) | null = null;
}

beforeEach(() => {
  (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = MockBroadcastChannel;

  // Set non-trivial state across all 3 stores so resets have something
  // meaningful to clear.
  useAuthStore.setState({
    user: mockUser,
    isLoading: false,
    lastSyncedAt: Date.now(),
  });
  useConsultationStore.setState({
    activeConsultationId: 'c-1',
    clientUuid: 'uuid-1',
    messages: [{ id: 'm1', role: 'user', content: 'hi', timestamp: 0 }],
    intakeDraft: { name: 'M', age: '26', gender: 'M', language: 'hi' },
    status: 'in_progress',
    language: 'hi',
    hasUnsavedChanges: true,
    photos: {},
    streamingMessageId: null,
    streamingContent: '',
    isStreaming: false,
    lastStreamError: null,
  });
  useUIStore.setState({
    sidebarCollapsed: true,
    lastVisitedRoute: '/consult/c-1',
    historyDrawerOpen: true,
    welcomeBannerDismissed: true,
    consultationSortOrder: 'oldest',
    toasts: [],
    activeModal: null,
    featureFlags: {},
  });
});

afterEach(() => {
  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  vi.restoreAllMocks();
});

// ─── resetAllStores ──────────────────────────────────────────

describe('resetAllStores (logout flow)', () => {
  it('clears the authenticated user', () => {
    resetAllStores();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('clears consultation state entirely', () => {
    resetAllStores();
    const s = useConsultationStore.getState();
    expect(s.activeConsultationId).toBeNull();
    expect(s.messages).toEqual([]);
    expect(s.intakeDraft).toEqual({
      name: '',
      age: '',
      gender: '',
      // language is preserved across clearConsultation (intake slice rule)
      language: 'hi',
    });
    expect(s.status).toBe('idle');
  });

  it('clears UI ephemeral state', () => {
    resetAllStores();
    const s = useUIStore.getState();
    expect(s.sidebarCollapsed).toBe(false);
    expect(s.lastVisitedRoute).toBeNull();
    expect(s.historyDrawerOpen).toBe(false);
  });

  it('PRESERVES welcomeBannerDismissed (UX preference)', () => {
    resetAllStores();
    expect(useUIStore.getState().welcomeBannerDismissed).toBe(true);
  });

  it('PRESERVES consultationSortOrder (UX preference)', () => {
    resetAllStores();
    expect(useUIStore.getState().consultationSortOrder).toBe('oldest');
  });

  it('is idempotent — second call is a no-op', () => {
    resetAllStores();
    // Capture state after first reset
    const authAfter = useAuthStore.getState();
    const uiAfter = useUIStore.getState();
    resetAllStores();
    // No changes expected
    expect(useAuthStore.getState().user).toEqual(authAfter.user);
    expect(useUIStore.getState().welcomeBannerDismissed).toEqual(uiAfter.welcomeBannerDismissed);
  });
});

// ─── hardResetAllStores ──────────────────────────────────────

describe('hardResetAllStores (account deletion flow)', () => {
  it('clears the authenticated user', () => {
    hardResetAllStores();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('WIPES welcomeBannerDismissed (back to onboarding)', () => {
    hardResetAllStores();
    expect(useUIStore.getState().welcomeBannerDismissed).toBe(false);
  });

  it('WIPES consultationSortOrder back to default', () => {
    hardResetAllStores();
    expect(useUIStore.getState().consultationSortOrder).toBe('newest');
  });

  it('removes datun-* localStorage keys directly', () => {
    localStorage.setItem('datun-auth', '{}');
    localStorage.setItem('datun-consultation', '{}');
    localStorage.setItem('datun-ui', '{}');
    localStorage.setItem('keep-me', 'untouched');

    hardResetAllStores();

    expect(localStorage.getItem('datun-auth')).toBeNull();
    expect(localStorage.getItem('datun-consultation')).toBeNull();
    expect(localStorage.getItem('datun-ui')).toBeNull();
    // Non-Datun keys are NOT touched
    expect(localStorage.getItem('keep-me')).toBe('untouched');
  });

  it('is idempotent — safe to call multiple times', () => {
    hardResetAllStores();
    expect(() => hardResetAllStores()).not.toThrow();
  });
});
