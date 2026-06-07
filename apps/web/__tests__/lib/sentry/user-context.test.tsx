// apps/web/__tests__/lib/sentry/user-context.test.tsx
// ═══════════════════════════════════════════════════════════════
// USER-CONTEXT TESTS — Task #52 Phase 1 (FIX: isPhoneVerified added)
//
// Verifies that:
//   1. Only `id` and `role` flow to Sentry — NEVER email/name/phone
//   2. Logout clears Sentry's user scope
//   3. Profile updates that don't change id+role are deduplicated
//      (no redundant Sentry.setUser calls)
//   4. Component mounts/unmounts cleanly
//
// PII-leak prevention is the central invariant — these tests are the
// gate that catches accidental email exposure during code review.
//
// FIX (post-typecheck): `isPhoneVerified` field added to AuthUserFixture
// to match the AuthUser schema from @repo/shared/validators/domains/auth.schema.
// Without this, TypeScript rejects fixture() arguments to setSentryUser()
// because setSentryUser expects the FULL AuthUser type.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';

// ── Mock Sentry BEFORE importing the module under test ──
vi.mock('@sentry/nextjs', () => ({
  setUser: vi.fn(),
  setTag: vi.fn(),
}));

// ── Mock the auth store ──
const subscribers = new Set<(state: { user: AuthUserFixture | null }) => void>();
let storeState: { user: AuthUserFixture | null } = { user: null };

vi.mock('@/stores', () => ({
  useAuthStore: Object.assign(() => storeState, {
    getState: () => storeState,
    subscribe: (listener: (state: { user: AuthUserFixture | null }) => void) => {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
  }),
}));

import * as Sentry from '@sentry/nextjs';
import { SentryUserContext, setSentryUser, shallowEqual } from '@/lib/sentry/user-context';

interface AuthUserFixture {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly phone: string | null;
  readonly avatarUrl: string | null;
  readonly role: string;
  readonly isEmailVerified: boolean;
  readonly isPhoneVerified: boolean;
}

function fixture(overrides?: Partial<AuthUserFixture>): AuthUserFixture {
  return {
    id: 'user_abc123',
    email: 'patient@example.com',
    name: 'Test Patient',
    phone: '+919876543210',
    avatarUrl: 'https://media.datunai.com/avatar.png',
    role: 'USER',
    isEmailVerified: true,
    isPhoneVerified: false,
    ...overrides,
  };
}

function emitUserChange(user: AuthUserFixture | null): void {
  storeState = { user };
  for (const listener of subscribers) {
    listener(storeState);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  subscribers.clear();
  storeState = { user: null };
});

describe('<SentryUserContext />', () => {
  it('applies the current user on mount (with hydrated state)', () => {
    storeState = { user: fixture() };
    render(<SentryUserContext />);

    expect(Sentry.setUser).toHaveBeenCalledTimes(1);
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user_abc123' });
    expect(Sentry.setTag).toHaveBeenCalledWith('user.role', 'USER');
    cleanup();
  });

  it('PRIVACY: never passes email, name, or phone to Sentry.setUser', () => {
    storeState = { user: fixture() };
    render(<SentryUserContext />);

    const userArg = (Sentry.setUser as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<
      string,
      unknown
    > | null;
    expect(userArg).not.toBeNull();
    expect(Object.keys(userArg!)).toEqual(['id']);
    expect(userArg).not.toHaveProperty('email');
    expect(userArg).not.toHaveProperty('name');
    expect(userArg).not.toHaveProperty('phone');
    expect(userArg).not.toHaveProperty('avatarUrl');
    cleanup();
  });

  it('applies null on initial mount when no user is hydrated', () => {
    storeState = { user: null };
    render(<SentryUserContext />);

    // Mount path: shallowEqual(null, null) === true → no setUser call.
    expect(Sentry.setUser).not.toHaveBeenCalled();
    cleanup();
  });

  it('responds to login (null → user)', () => {
    render(<SentryUserContext />);
    expect(Sentry.setUser).not.toHaveBeenCalled();

    act(() => {
      emitUserChange(fixture({ id: 'user_login', role: 'USER' }));
    });

    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user_login' });
    expect(Sentry.setTag).toHaveBeenCalledWith('user.role', 'USER');
    cleanup();
  });

  it('responds to logout (user → null)', () => {
    storeState = { user: fixture() };
    render(<SentryUserContext />);

    (Sentry.setUser as ReturnType<typeof vi.fn>).mockClear();
    (Sentry.setTag as ReturnType<typeof vi.fn>).mockClear();

    act(() => {
      emitUserChange(null);
    });

    expect(Sentry.setUser).toHaveBeenCalledWith(null);
    // setTag is called with `undefined` to clear the role tag.
    expect(Sentry.setTag).toHaveBeenCalledWith('user.role', undefined);
    cleanup();
  });

  it('responds to role change (USER → CLINIC)', () => {
    storeState = { user: fixture({ role: 'USER' }) };
    render(<SentryUserContext />);

    (Sentry.setTag as ReturnType<typeof vi.fn>).mockClear();

    act(() => {
      emitUserChange(fixture({ role: 'CLINIC' }));
    });

    expect(Sentry.setTag).toHaveBeenCalledWith('user.role', 'CLINIC');
    cleanup();
  });

  it('DEDUPLICATES: profile edit that does NOT change id+role is a no-op', () => {
    storeState = { user: fixture({ id: 'u1', role: 'USER', name: 'Old Name' }) };
    render(<SentryUserContext />);

    expect(Sentry.setUser).toHaveBeenCalledTimes(1);
    (Sentry.setUser as ReturnType<typeof vi.fn>).mockClear();

    act(() => {
      // Profile name change — id and role unchanged.
      emitUserChange(fixture({ id: 'u1', role: 'USER', name: 'New Name' }));
    });

    expect(Sentry.setUser).not.toHaveBeenCalled();
    cleanup();
  });

  it('clears Sentry user on unmount', () => {
    storeState = { user: fixture() };
    const { unmount } = render(<SentryUserContext />);

    (Sentry.setUser as ReturnType<typeof vi.fn>).mockClear();
    unmount();

    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });
});

describe('setSentryUser() (imperative API)', () => {
  it('applies a user identically to the component', () => {
    setSentryUser(fixture({ id: 'imperative', role: 'ADMIN' }));
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'imperative' });
    expect(Sentry.setTag).toHaveBeenCalledWith('user.role', 'ADMIN');
  });

  it('clears the user when called with null', () => {
    setSentryUser(null);
    expect(Sentry.setUser).toHaveBeenCalledWith(null);
  });

  it('PRIVACY: never leaks email even via imperative API', () => {
    setSentryUser(fixture());
    const arg = (Sentry.setUser as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as Record<
      string,
      unknown
    > | null;
    expect(arg).not.toHaveProperty('email');
    expect(arg).not.toHaveProperty('name');
    expect(arg).not.toHaveProperty('phone');
  });
});

describe('shallowEqual()', () => {
  it('returns true for identical references', () => {
    const u = { id: 'x', role: 'USER' };
    expect(shallowEqual(u, u)).toBe(true);
  });

  it('returns true for structurally identical objects', () => {
    expect(shallowEqual({ id: 'x', role: 'USER' }, { id: 'x', role: 'USER' })).toBe(true);
  });

  it('returns false when id differs', () => {
    expect(shallowEqual({ id: 'a', role: 'USER' }, { id: 'b', role: 'USER' })).toBe(false);
  });

  it('returns false when role differs', () => {
    expect(shallowEqual({ id: 'x', role: 'USER' }, { id: 'x', role: 'ADMIN' })).toBe(false);
  });

  it('handles null on either side', () => {
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(null, { id: 'x', role: 'USER' })).toBe(false);
    expect(shallowEqual({ id: 'x', role: 'USER' }, null)).toBe(false);
  });
});
