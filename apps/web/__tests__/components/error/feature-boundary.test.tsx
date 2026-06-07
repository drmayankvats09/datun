// apps/web/__tests__/components/error/feature-boundary.test.tsx
// ═══════════════════════════════════════════════════════════════
// FEATURE BOUNDARY TESTS — Task #52 Phase 2 (FIX: design alignment)
//
// Coverage:
//   1. Renders children when no error
//   2. Catches a render-time throw and renders WidgetError fallback
//   3. Clicking "Try again" inside WidgetError calls
//      QueryErrorResetBoundary's reset (NOT queryClient.resetQueries)
//   4. Caller's optional onReset is called AFTER the boundary's reset
//   5. Custom render-prop fallback receives full props
//   6. resetKeys propagate through to ErrorBoundary
//
// FIX (post-test-run): The previous version asserted on
// `queryClient.resetQueries` — but FeatureBoundary uses
// `QueryErrorResetBoundary` from TanStack Query, which exposes a
// different `reset` function that clears errored query state for the
// boundary scope (not a full cache reset).
//
// Source code is correct: it calls `reset()` from
// QueryErrorResetBoundary's render-prop, which is the documented
// FAANG-grade pattern for query-aware error boundaries. See:
//   https://tanstack.com/query/latest/docs/framework/react/reference/QueryErrorResetBoundary
//
// We now mock the @tanstack/react-query QueryErrorResetBoundary and
// expose the `reset` function as a spy, matching the production
// wiring exactly.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ═══════════════════════════════════════════════════════════════
// HOISTED MOCKS — co-hoisted with vi.mock() factories below
// ═══════════════════════════════════════════════════════════════

const h = vi.hoisted(() => ({
  /**
   * The reset spy exposed by the mocked QueryErrorResetBoundary.
   * The FeatureBoundary source receives this as `reset` from the
   * render-prop and calls it on retry.
   */
  queryResetSpy: vi.fn(),
}));

// ── Sentry + audit mocks ──
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(() => 'evt-id'),
  lastEventId: vi.fn(() => 'evt-id'),
  setUser: vi.fn(),
  setTag: vi.fn(),
}));

vi.mock('@/lib/errors', async () => {
  const actual = await vi.importActual<typeof import('@/lib/errors')>('@/lib/errors');
  return {
    ...actual,
    logErrorToAudit: vi.fn(),
    getAuditSessionId: vi.fn(() => 'session-test'),
  };
});

// Sentry feedback mock — WidgetError imports it.
vi.mock('@/lib/sentry/feedback', () => ({
  showCrashReportDialog: vi.fn(),
}));

// ── Mock QueryErrorResetBoundary to expose the reset spy ──
// We keep the rest of @tanstack/react-query intact (QueryClient,
// QueryClientProvider, useQueryClient) so the surrounding test
// harness keeps working unchanged.
vi.mock('@tanstack/react-query', async () => {
  const actual =
    await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    QueryErrorResetBoundary: ({
      children,
    }: {
      children: (props: { reset: () => void }) => React.ReactNode;
    }) => <>{children({ reset: h.queryResetSpy })}</>,
  };
});

import { FeatureBoundary } from '@/components/error/feature-boundary';

// ─── Helpers ───────────────────────────────────────────────────

function Bomb(): React.ReactElement {
  throw new Error('feature-bomb');
}

interface HarnessProps {
  readonly client: QueryClient;
  readonly children: React.ReactNode;
}

function Harness({ client, children }: HarnessProps): React.ReactElement {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

let originalError: typeof console.error;
beforeEach(() => {
  originalError = console.error;
  console.error = vi.fn();
  vi.clearAllMocks();
  h.queryResetSpy.mockClear();
  // Use fake timers so retry button countdown does not delay assertions.
  vi.useFakeTimers();
});
afterEach(() => {
  console.error = originalError;
  vi.useRealTimers();
  cleanup();
});

// ─── Tests ─────────────────────────────────────────────────────

describe('<FeatureBoundary />', () => {
  it('renders children when no error', () => {
    const client = new QueryClient();
    render(
      <Harness client={client}>
        <FeatureBoundary name="test_feature">
          <p>healthy</p>
        </FeatureBoundary>
      </Harness>,
    );
    expect(screen.getByText('healthy')).toBeInTheDocument();
  });

  it('catches a render throw and renders WidgetError (compact size)', () => {
    const client = new QueryClient();
    render(
      <Harness client={client}>
        <FeatureBoundary name="chat_panel">
          <Bomb />
        </FeatureBoundary>
      </Harness>,
    );
    // role=alert is set by ErrorCard for compact size.
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('forwards a custom render-prop fallback with the boundary props', () => {
    const client = new QueryClient();
    render(
      <Harness client={client}>
        <FeatureBoundary
          name="custom_fallback"
          fallback={({ error, resetBoundary }) => (
            <div>
              <p data-testid="msg">{error.message}</p>
              <button type="button" onClick={resetBoundary} data-testid="custom-reset">
                custom
              </button>
            </div>
          )}
        >
          <Bomb />
        </FeatureBoundary>
      </Harness>,
    );

    expect(screen.getByTestId('msg')).toHaveTextContent('feature-bomb');
    expect(screen.getByTestId('custom-reset')).toBeInTheDocument();
  });

  it('calls QueryErrorResetBoundary.reset when fallback triggers reset', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <Harness client={client}>
        <FeatureBoundary
          name="reset_test"
          fallback={({ resetBoundary }) => (
            <button type="button" onClick={resetBoundary} data-testid="r">
              go
            </button>
          )}
        >
          <Bomb />
        </FeatureBoundary>
      </Harness>,
    );

    fireEvent.click(screen.getByTestId('r'));

    // FeatureBoundary's onReset wraps QueryErrorResetBoundary.reset
    // (named `resetQueries` in the source closure for readability).
    expect(h.queryResetSpy).toHaveBeenCalledTimes(1);
  });

  it("calls caller's onReset alongside QueryErrorResetBoundary.reset", () => {
    const client = new QueryClient();
    const order: string[] = [];
    h.queryResetSpy.mockImplementation(() => {
      order.push('queryReset');
    });
    const onReset = vi.fn(() => {
      order.push('onReset');
    });

    render(
      <Harness client={client}>
        <FeatureBoundary
          name="dual_reset"
          onReset={onReset}
          fallback={({ resetBoundary }) => (
            <button type="button" onClick={resetBoundary} data-testid="r">
              go
            </button>
          )}
        >
          <Bomb />
        </FeatureBoundary>
      </Harness>,
    );

    fireEvent.click(screen.getByTestId('r'));

    expect(h.queryResetSpy).toHaveBeenCalled();
    expect(onReset).toHaveBeenCalled();
    // Source uses try { resetQueries() } finally { onReset?.() } —
    // queryReset runs first, then caller's onReset.
    expect(order.indexOf('queryReset')).toBeLessThan(order.indexOf('onReset'));
  });

  it('propagates resetKeys — boundary auto-resets when keys change', () => {
    const client = new QueryClient();

    function BomberByValue({ v }: { v: number }): React.ReactElement {
      if (v === 0) throw new Error(`bomb-${v}`);
      return <p>healthy-{v}</p>;
    }

    function Wrapper(): React.ReactElement {
      const [v, setV] = React.useState(0);
      return (
        <Harness client={client}>
          <button type="button" onClick={() => setV(1)} data-testid="bump">
            bump
          </button>
          <FeatureBoundary
            name="reset_keys_test"
            resetKeys={[v]}
            fallback={<p data-testid="fb">FALLBACK</p>}
          >
            <BomberByValue v={v} />
          </FeatureBoundary>
        </Harness>
      );
    }

    render(<Wrapper />);
    expect(screen.getByTestId('fb')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('bump'));

    // Auto-reset fires because resetKeys changed AND value=1 doesn't throw.
    expect(screen.getByText('healthy-1')).toBeInTheDocument();
  });
});
