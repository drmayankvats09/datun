// ═══════════════════════════════════════════════════════════════
// SELECTORS TESTS — Verify the 27 atomic typed selectors
//
// Tests the public selector hooks from `stores/selectors.ts`:
//   - Auth: useUser, useIsAuthenticated, useUserId, useUserEmail,
//           useAuthLoading, useLastAuthSyncedAt, useAuthActions
//   - Consultation: useActiveConsultationId, useClientUuid, useMessages,
//           useMessageCount, useLastMessage, useConsultationStatus,
//           useIsConsultationActive/Completed/Intake, useIntakeDraft,
//           useIsIntakeComplete, useCurrentLanguage, useHasUnsavedChanges,
//           useIntakeFields, useConsultationActions, useResumeConsultation
//   - UI: useSidebarCollapsed, useHistoryDrawerOpen, useLastVisitedRoute,
//         useWelcomeBannerDismissed, useConsultationSortOrder, useUIActions
//
// We use renderHook (testing-library) to invoke the selectors in a React
// context, then verify their return values against known store state.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import {
  // Auth
  useUser,
  useIsAuthenticated,
  useUserId,
  useUserEmail,
  useAuthLoading,
  useLastAuthSyncedAt,
  useAuthActions,
  // Consultation
  useActiveConsultationId,
  useClientUuid,
  useMessages,
  useMessageCount,
  useLastMessage,
  useConsultationStatus,
  useIsConsultationActive,
  useIsConsultationCompleted,
  useIsConsultationIntake,
  useIntakeDraft,
  useIsIntakeComplete,
  useCurrentLanguage,
  useHasUnsavedChanges,
  useIntakeFields,
  useConsultationActions,
  useResumeConsultation,
  // UI
  useSidebarCollapsed,
  useHistoryDrawerOpen,
  useLastVisitedRoute,
  useWelcomeBannerDismissed,
  useConsultationSortOrder,
  useUIActions,
} from '../../stores/selectors';

import { useAuthStore } from '../../stores/auth.store';
import { useConsultationStore } from '../../stores/consultation.store';
import { useUIStore } from '../../stores/ui.store';
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

// ─── Reset all stores before every test ───────────────────────

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    isLoading: true,
    lastSyncedAt: null,
    __hasHydrated: false,
  });
  useConsultationStore.setState({
    activeConsultationId: null,
    clientUuid: null,
    messages: [],
    intakeDraft: { name: '', age: '', gender: '', language: 'en' },
    status: 'idle',
    language: 'en',
    hasUnsavedChanges: false,
    photos: {},
    streamingMessageId: null,
    streamingContent: '',
    isStreaming: false,
    lastStreamError: null,
    __hasHydrated: false,
  });
  useUIStore.setState({
    sidebarCollapsed: false,
    lastVisitedRoute: null,
    historyDrawerOpen: false,
    welcomeBannerDismissed: false,
    consultationSortOrder: 'newest',
    toasts: [],
    activeModal: null,
    featureFlags: {},
    __hasHydrated: false,
  });
});

// ─── Auth selectors ───────────────────────────────────────────

describe('Auth selectors', () => {
  it('useUser returns null then user object', () => {
    expect(renderHook(() => useUser()).result.current).toBeNull();
    useAuthStore.setState({ user: mockUser });
    expect(renderHook(() => useUser()).result.current).toEqual(mockUser);
  });

  it('useIsAuthenticated reflects user presence', () => {
    expect(renderHook(() => useIsAuthenticated()).result.current).toBe(false);
    useAuthStore.setState({ user: mockUser });
    expect(renderHook(() => useIsAuthenticated()).result.current).toBe(true);
  });

  it('useUserId returns null when logged out, ID when authed', () => {
    expect(renderHook(() => useUserId()).result.current).toBeNull();
    useAuthStore.setState({ user: mockUser });
    expect(renderHook(() => useUserId()).result.current).toBe('user-001');
  });

  it('useUserEmail returns null then email', () => {
    expect(renderHook(() => useUserEmail()).result.current).toBeNull();
    useAuthStore.setState({ user: mockUser });
    expect(renderHook(() => useUserEmail()).result.current).toBe('test@datunai.com');
  });

  it('useAuthLoading reflects loading flag', () => {
    expect(renderHook(() => useAuthLoading()).result.current).toBe(true);
    useAuthStore.setState({ isLoading: false });
    expect(renderHook(() => useAuthLoading()).result.current).toBe(false);
  });

  it('useLastAuthSyncedAt returns null then timestamp', () => {
    expect(renderHook(() => useLastAuthSyncedAt()).result.current).toBeNull();
    useAuthStore.setState({ lastSyncedAt: 1_700_000_000_000 });
    expect(renderHook(() => useLastAuthSyncedAt()).result.current).toBe(1_700_000_000_000);
  });

  it('useAuthActions exposes stable action references', () => {
    const { result } = renderHook(() => useAuthActions());
    expect(typeof result.current.setUser).toBe('function');
    expect(typeof result.current.clearUser).toBe('function');
    expect(typeof result.current.updateUser).toBe('function');
    expect(typeof result.current.setLoading).toBe('function');
  });
});

// ─── Consultation selectors ──────────────────────────────────

describe('Consultation selectors', () => {
  it('useActiveConsultationId reflects ID', () => {
    expect(renderHook(() => useActiveConsultationId()).result.current).toBeNull();
    useConsultationStore.setState({ activeConsultationId: 'c-1' });
    expect(renderHook(() => useActiveConsultationId()).result.current).toBe('c-1');
  });

  it('useClientUuid reflects UUID', () => {
    useConsultationStore.setState({ clientUuid: 'uuid-1' });
    expect(renderHook(() => useClientUuid()).result.current).toBe('uuid-1');
  });

  it('useMessages and useMessageCount agree on length', () => {
    const m = (id: string) => ({ id, role: 'user', content: '', timestamp: 0 }) as const;
    useConsultationStore.setState({ messages: [m('a'), m('b'), m('c')] });
    expect(renderHook(() => useMessages()).result.current).toHaveLength(3);
    expect(renderHook(() => useMessageCount()).result.current).toBe(3);
  });

  it('useLastMessage returns last entry or null', () => {
    expect(renderHook(() => useLastMessage()).result.current).toBeNull();
    useConsultationStore.setState({
      messages: [
        { id: 'a', role: 'user', content: 'first', timestamp: 1 },
        { id: 'b', role: 'assistant', content: 'last', timestamp: 2 },
      ],
    });
    expect(renderHook(() => useLastMessage()).result.current?.id).toBe('b');
  });

  it('useConsultationStatus + Active/Completed/Intake booleans', () => {
    useConsultationStore.setState({ status: 'in_progress' });
    expect(renderHook(() => useConsultationStatus()).result.current).toBe('in_progress');
    expect(renderHook(() => useIsConsultationActive()).result.current).toBe(true);
    expect(renderHook(() => useIsConsultationCompleted()).result.current).toBe(false);
    expect(renderHook(() => useIsConsultationIntake()).result.current).toBe(false);

    useConsultationStore.setState({ status: 'completed' });
    expect(renderHook(() => useIsConsultationCompleted()).result.current).toBe(true);

    useConsultationStore.setState({ status: 'intake' });
    expect(renderHook(() => useIsConsultationIntake()).result.current).toBe(true);
  });

  it('useIntakeDraft + useIntakeFields shape', () => {
    useConsultationStore.setState({
      intakeDraft: { name: 'M', age: '26', gender: 'M', language: 'hi' },
    });
    expect(renderHook(() => useIntakeDraft()).result.current).toEqual({
      name: 'M',
      age: '26',
      gender: 'M',
      language: 'hi',
    });
    expect(renderHook(() => useIntakeFields()).result.current).toEqual({
      name: 'M',
      age: '26',
      gender: 'M',
      language: 'hi',
    });
  });

  it('useIsIntakeComplete checks all four fields non-empty after trim', () => {
    expect(renderHook(() => useIsIntakeComplete()).result.current).toBe(false);
    useConsultationStore.setState({
      intakeDraft: { name: 'M', age: '26', gender: 'M', language: 'en' },
    });
    expect(renderHook(() => useIsIntakeComplete()).result.current).toBe(true);
    // Whitespace-only fails the check
    useConsultationStore.setState({
      intakeDraft: { name: '  ', age: '26', gender: 'M', language: 'en' },
    });
    expect(renderHook(() => useIsIntakeComplete()).result.current).toBe(false);
  });

  it('useCurrentLanguage and useHasUnsavedChanges', () => {
    useConsultationStore.setState({ language: 'ta' });
    expect(renderHook(() => useCurrentLanguage()).result.current).toBe('ta');

    expect(renderHook(() => useHasUnsavedChanges()).result.current).toBe(false);
    useConsultationStore.setState({ hasUnsavedChanges: true });
    expect(renderHook(() => useHasUnsavedChanges()).result.current).toBe(true);
  });

  it('useConsultationActions exposes action functions', () => {
    const { result } = renderHook(() => useConsultationActions());
    expect(typeof result.current.startConsultation).toBe('function');
    expect(typeof result.current.addMessage).toBe('function');
    expect(typeof result.current.clearConsultation).toBe('function');
    expect(typeof result.current.markSaved).toBe('function');
  });

  it('useResumeConsultation returns the resume action', () => {
    const { result } = renderHook(() => useResumeConsultation());
    expect(typeof result.current).toBe('function');
    // Call it and verify state change
    result.current('c-resume', [], 'in_progress');
    expect(useConsultationStore.getState().activeConsultationId).toBe('c-resume');
  });
});

// ─── UI selectors ────────────────────────────────────────────

describe('UI selectors', () => {
  it('useSidebarCollapsed reflects state', () => {
    useUIStore.setState({ sidebarCollapsed: true });
    expect(renderHook(() => useSidebarCollapsed()).result.current).toBe(true);
  });

  it('useHistoryDrawerOpen reflects state', () => {
    useUIStore.setState({ historyDrawerOpen: true });
    expect(renderHook(() => useHistoryDrawerOpen()).result.current).toBe(true);
  });

  it('useLastVisitedRoute reflects state', () => {
    useUIStore.setState({ lastVisitedRoute: '/consult/abc' });
    expect(renderHook(() => useLastVisitedRoute()).result.current).toBe('/consult/abc');
  });

  it('useWelcomeBannerDismissed + useConsultationSortOrder', () => {
    useUIStore.setState({
      welcomeBannerDismissed: true,
      consultationSortOrder: 'oldest',
    });
    expect(renderHook(() => useWelcomeBannerDismissed()).result.current).toBe(true);
    expect(renderHook(() => useConsultationSortOrder()).result.current).toBe('oldest');
  });

  it('useUIActions exposes action functions', () => {
    const { result } = renderHook(() => useUIActions());
    expect(typeof result.current.toggleSidebar).toBe('function');
    expect(typeof result.current.setSidebarCollapsed).toBe('function');
    expect(typeof result.current.dismissWelcomeBanner).toBe('function');
  });
});
