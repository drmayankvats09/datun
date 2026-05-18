// apps/web/__tests__/hooks/queries/use-current-user.test.tsx
// ═══════════════════════════════════════════════════════════════
// useCurrentUser — Hook Tests
// Task #47 Phase 3
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AuthUser } from '@repo/shared';

// Mock the API surface BEFORE importing the hook so the import
// graph picks up the mocked module.
vi.mock('@/lib/api', () => ({
  api: {
    auth: {
      me: vi.fn(),
    },
  },
}));

// Now safe to import — Vitest hoists vi.mock above this.
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/queries/use-current-user';

const mockedMe = vi.mocked(api.auth.me);

const SAMPLE_USER: AuthUser = {
  id: 'user-1',
  email: 'mayank@datunai.com',
  name: 'Mayank Vats',
  phone: null,
  emailVerified: true,
  phoneVerified: false,
  role: 'PATIENT',
  createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
  updatedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
} as unknown as AuthUser;

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

describe('useCurrentUser', () => {
  beforeEach(() => {
    mockedMe.mockReset();
  });

  it('happy path — returns the user on success', async () => {
    mockedMe.mockResolvedValueOnce(SAMPLE_USER);

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(SAMPLE_USER);
    expect(mockedMe).toHaveBeenCalledTimes(1);
  });

  it('forwards AbortSignal from TanStack to the API call', async () => {
    mockedMe.mockResolvedValueOnce(SAMPLE_USER);

    renderHook(() => useCurrentUser(), { wrapper: makeWrapper() });
    await waitFor(() => expect(mockedMe).toHaveBeenCalled());

    const callArg = mockedMe.mock.calls[0]?.[0];
    expect(callArg).toHaveProperty('signal');
    expect(callArg?.signal).toBeInstanceOf(AbortSignal);
  });

  it('skips the network call when enabled = false', async () => {
    const { result } = renderHook(() => useCurrentUser({ enabled: false }), {
      wrapper: makeWrapper(),
    });

    // Wait a tick to ensure no fetch occurs.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(mockedMe).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('surfaces error to the consumer when the call fails', async () => {
    mockedMe.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('boom');
  });
});
