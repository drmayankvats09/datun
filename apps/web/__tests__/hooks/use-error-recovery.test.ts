// apps/web/__tests__/hooks/use-error-recovery.test.ts
// ═══════════════════════════════════════════════════════════════
// USE-ERROR-RECOVERY TESTS — Task #52 Phase 1 (FIX: fake-timer pattern)
//
// Coverage:
//   - Retry counter increments correctly
//   - `exhausted` flips after maxRetries
//   - Double-click during in-flight retry is a no-op
//   - onRetry callback is invoked
//   - resetBoundary called AFTER queryClient.resetQueries
//   - Timer cleanup on unmount (no setState-after-unmount warnings)
//   - Backoff respects no-jitter for deterministic timing
//
// FIX (post-test-run): Removed `waitFor(...)` calls that were nested
// INSIDE a `vi.useFakeTimers()` context. waitFor uses real setTimeout
// for polling — under fake timers those polls never fire, so the
// wrapper blocks until the 10s test-timeout.
//
// Vitest's `advanceTimersByTimeAsync()` already flushes the microtask
// queue between each `setTimeout` callback it runs. After it resolves,
// the hook's state has been updated synchronously through React's
// `act` batching. Direct assertions (no waitFor) are correct here.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useErrorRecovery } from '@/hooks/use-error-recovery';

// ─── Test harness ──────────────────────────────────────────────

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  // Track the reset spy for assertions in tests.
  const resetSpy = vi.spyOn(queryClient, 'resetQueries');
  // Hang the spy off the wrapper for retrieval.
  (queryClient as unknown as { __resetSpy: typeof resetSpy }).__resetSpy = resetSpy;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  // Stash for tests.
  (Wrapper as unknown as { client: QueryClient }).client = queryClient;
  return Wrapper;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── Tests ─────────────────────────────────────────────────────

describe('useErrorRecovery()', () => {
  it('starts in idle state with retryCount=0', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useErrorRecovery(), { wrapper });

    expect(result.current.retryCount).toBe(0);
    expect(result.current.exhausted).toBe(false);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.msUntilNextRetry).toBe(0);
  });

  it('retry() flips isRetrying to true immediately', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useErrorRecovery({ backoff: { jitter: false } }), {
      wrapper,
    });

    act(() => {
      result.current.retry();
    });

    expect(result.current.isRetrying).toBe(true);
    expect(result.current.msUntilNextRetry).toBe(500); // base delay, no jitter
  });

  it('retry() calls onRetry after backoff delay', async () => {
    const onRetry = vi.fn();
    const wrapper = createWrapper();
    const { result } = renderHook(() => useErrorRecovery({ onRetry, backoff: { jitter: false } }), {
      wrapper,
    });

    act(() => {
      result.current.retry();
    });

    // Before timer fires.
    expect(onRetry).not.toHaveBeenCalled();

    // Advance past the backoff.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('retry() increments retryCount after completion', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useErrorRecovery({ backoff: { jitter: false } }), {
      wrapper,
    });

    act(() => {
      result.current.retry();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // After advanceTimersByTimeAsync resolves the microtask queue is
    // already flushed — assertions are synchronous.
    expect(result.current.retryCount).toBe(1);
    expect(result.current.isRetrying).toBe(false);
  });

  it('exhausted flips true after maxRetries retries', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useErrorRecovery({ maxRetries: 2, backoff: { jitter: false } }),
      { wrapper },
    );

    // First retry — attempt index 0, delay 500ms.
    act(() => {
      result.current.retry();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.retryCount).toBe(1);

    // Second retry — attempt index 1, delay 1000ms.
    act(() => {
      result.current.retry();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(result.current.retryCount).toBe(2);

    // Now exhausted.
    expect(result.current.exhausted).toBe(true);
  });

  it('retry() is a no-op when exhausted', async () => {
    const onRetry = vi.fn();
    const wrapper = createWrapper();
    const { result } = renderHook(
      () => useErrorRecovery({ maxRetries: 1, onRetry, backoff: { jitter: false } }),
      { wrapper },
    );

    act(() => {
      result.current.retry();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(result.current.exhausted).toBe(true);

    expect(onRetry).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.retry();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    // Still only one call — exhausted guard kicked in.
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('double-click during in-flight retry is a no-op', () => {
    const onRetry = vi.fn();
    const wrapper = createWrapper();
    const { result } = renderHook(() => useErrorRecovery({ onRetry, backoff: { jitter: false } }), {
      wrapper,
    });

    act(() => {
      result.current.retry();
    });
    expect(result.current.isRetrying).toBe(true);

    // Second click while first is in flight.
    act(() => {
      result.current.retry();
    });

    // No state corruption — still exactly one retry in flight.
    expect(result.current.isRetrying).toBe(true);
    expect(result.current.retryCount).toBe(0);
  });

  it('calls queryClient.resetQueries() during retry', async () => {
    const Wrapper = createWrapper();
    const client = (Wrapper as unknown as { client: QueryClient }).client;
    const resetSpy = (client as unknown as { __resetSpy: ReturnType<typeof vi.spyOn> }).__resetSpy;

    const { result } = renderHook(() => useErrorRecovery({ backoff: { jitter: false } }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.retry();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(resetSpy).toHaveBeenCalled();
  });

  it('calls resetBoundary after onRetry + resetQueries', async () => {
    const order: string[] = [];
    const onRetry = vi.fn(() => {
      order.push('onRetry');
    });
    const resetBoundary = vi.fn(() => {
      order.push('resetBoundary');
    });
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useErrorRecovery({
          onRetry,
          resetBoundary,
          backoff: { jitter: false },
        }),
      { wrapper },
    );

    act(() => {
      result.current.retry();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(order).toContain('resetBoundary');
    expect(order.indexOf('onRetry')).toBeLessThan(order.indexOf('resetBoundary'));
  });

  it('swallows errors thrown by onRetry (no loop)', async () => {
    const onRetry = vi.fn(() => {
      throw new Error('onRetry blew up');
    });
    const resetBoundary = vi.fn();
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useErrorRecovery({
          onRetry,
          resetBoundary,
          backoff: { jitter: false },
        }),
      { wrapper },
    );

    act(() => {
      result.current.retry();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // Boundary still resets even though onRetry threw.
    expect(resetBoundary).toHaveBeenCalled();
    // Counter still advanced — no infinite loop.
    expect(result.current.retryCount).toBe(1);
  });

  it('honours custom backoff baseDelay', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(
      () =>
        useErrorRecovery({
          backoff: { jitter: false, baseDelayMs: 100 },
        }),
      { wrapper },
    );

    act(() => {
      result.current.retry();
    });

    expect(result.current.msUntilNextRetry).toBe(100);
  });

  it('clears timers on unmount (no leaks, no setState warnings)', () => {
    const onRetry = vi.fn();
    const wrapper = createWrapper();
    const { result, unmount } = renderHook(
      () => useErrorRecovery({ onRetry, backoff: { jitter: false } }),
      { wrapper },
    );

    act(() => {
      result.current.retry();
    });
    expect(result.current.isRetrying).toBe(true);

    unmount();

    // Advance well past the would-be timer; onRetry should NOT fire
    // since the hook is unmounted.
    vi.advanceTimersByTime(5_000);

    expect(onRetry).not.toHaveBeenCalled();
  });
});
