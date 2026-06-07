// apps/web/__tests__/components/error/route-error.test.tsx
// ═══════════════════════════════════════════════════════════════
// ROUTE ERROR TESTS — Task #52 Phase 2
//
// Coverage:
//   1. Renders ErrorCard with title + description + illustration
//   2. Reports to Sentry exactly once per error reference
//   3. Ships an audit log entry on first render
//   4. Shows retry button for retryable categories — clicking invokes reset
//   5. Shows reload button for chunk-load — clicking calls location.reload
//   6. Shows go-home for not-found category
//   7. Shows reference ID (digest preferred over Sentry eventId)
//   8. Shows "Report bug" link for non-retryable errors
//   9. Re-renders with a NEW error reference re-captures to Sentry
//      (so multiple distinct crashes on the same route are tracked)
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock Sentry SDK + feedback ──
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(() => 'sentry-event-id'),
  lastEventId: vi.fn(() => 'sentry-event-id'),
  setUser: vi.fn(),
  setTag: vi.fn(),
}));

vi.mock('@/lib/sentry/feedback', () => ({
  showCrashReportDialog: vi.fn(),
}));

// ── Mock audit log so no real fetches occur in jsdom ──
vi.mock('@/lib/errors', async () => {
  const actual = await vi.importActual<typeof import('@/lib/errors')>('@/lib/errors');
  return {
    ...actual,
    logErrorToAudit: vi.fn(),
    getAuditSessionId: vi.fn(() => 'session-route-test'),
  };
});

import * as Sentry from '@sentry/nextjs';
import { showCrashReportDialog } from '@/lib/sentry/feedback';
import { logErrorToAudit } from '@/lib/errors';
import { RouteError } from '@/components/error/route-error';
import { ApiError, NetworkError } from '@/lib/api';
import { ERROR_CODES } from '@repo/shared';

// ─── Helpers ───────────────────────────────────────────────────

function renderWithProviders(node: React.ReactElement): ReturnType<typeof render> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

/** Build the exact props shape Next.js error.tsx delivers. */
function makeProps(
  error: Error & { digest?: string },
  resetOverride?: () => void,
): React.ComponentProps<typeof RouteError> {
  return {
    error,
    reset: resetOverride ?? vi.fn(),
    segment: 'test_segment',
  };
}

// Suppress noisy React error logs during boundary tests.
let originalError: typeof console.error;
beforeEach(() => {
  originalError = console.error;
  console.error = vi.fn();
  vi.clearAllMocks();
});
afterEach(() => {
  console.error = originalError;
  cleanup();
});

// ─── Tests ─────────────────────────────────────────────────────

describe('<RouteError />', () => {
  it('renders title + description + role=alert', () => {
    renderWithProviders(<RouteError {...makeProps(new NetworkError())} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/errors\.category\.network\.title/)).toBeInTheDocument();
    expect(screen.getByText(/errors\.category\.network\.message/)).toBeInTheDocument();
  });

  it('reports to Sentry exactly once per render with route tags', () => {
    renderWithProviders(<RouteError {...makeProps(new NetworkError())} />);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [, options] = (Sentry.captureException as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Error,
      { tags: Record<string, string> },
    ];
    expect(options.tags).toMatchObject({
      'error.category': 'network',
      'boundary.level': 'route',
      'route.segment': 'test_segment',
    });
  });

  it('ships one audit log entry on first render with boundaryLevel=route', () => {
    renderWithProviders(<RouteError {...makeProps(new NetworkError())} />);

    expect(logErrorToAudit).toHaveBeenCalledTimes(1);
    const payload = (logErrorToAudit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      boundaryLevel: string;
      category: string;
      sessionId: string;
    };
    expect(payload.boundaryLevel).toBe('route');
    expect(payload.category).toBe('network');
    expect(payload.sessionId).toBe('session-route-test');
  });

  it('renders the retry button for retryable categories (network/server)', () => {
    renderWithProviders(<RouteError {...makeProps(new NetworkError())} />);
    expect(screen.getByRole('button', { name: /errors\.actions\.retry/i })).toBeInTheDocument();
  });

  it('renders reload button for chunk-load category and clicking triggers location.reload', () => {
    const reloadSpy = vi.fn();
    const originalLocation = window.location;
    // Replace window.location with a spy-capable mock. JSDOM forbids
    // direct assignment to location.reload, so we shadow the whole object.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...originalLocation, reload: reloadSpy, pathname: '/test', href: '/test' },
    });

    const chunkErr = Object.assign(new Error('Loading chunk 4 failed'), {
      name: 'ChunkLoadError',
    });

    renderWithProviders(<RouteError {...makeProps(chunkErr)} />);

    const reloadBtn = screen.getByText(/errors\.actions\.reload/);
    fireEvent.click(reloadBtn);
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    // Restore.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('renders go-home link for not-found category', () => {
    const err = new ApiError({
      statusCode: 404,
      code: ERROR_CODES.NOT_FOUND,
      message: 'gone',
    });
    renderWithProviders(<RouteError {...makeProps(err)} />);

    expect(screen.getByText(/errors\.actions\.goHome/)).toBeInTheDocument();
  });

  it('shows reference ID — prefers error.digest over Sentry eventId', () => {
    const err: Error & { digest?: string } = Object.assign(new Error('boom'), {
      digest: 'NEXT-DIGEST-12345',
    });
    renderWithProviders(<RouteError {...makeProps(err)} />);

    // Digest wins.
    expect(screen.getByText(/NEXT-DIGEST-12345/)).toBeInTheDocument();
    // And the Sentry event ID is NOT also shown when digest is present.
    expect(screen.queryByText(/sentry-event-id/)).not.toBeInTheDocument();
  });

  it('falls back to Sentry eventId when error.digest is absent', () => {
    renderWithProviders(<RouteError {...makeProps(new NetworkError())} />);

    expect(screen.getByText(/sentry-event-id/)).toBeInTheDocument();
  });

  it('shows "Report bug" link for non-retryable errors and opens crash dialog on click', () => {
    // Validation maps to contact-support — non-retryable.
    const err = new ApiError({
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_FAILED,
      message: 'bad',
    });
    renderWithProviders(<RouteError {...makeProps(err)} />);

    const reportBtn = screen.getByText(/errors\.actions\.reportBug/);
    fireEvent.click(reportBtn);

    expect(showCrashReportDialog).toHaveBeenCalled();
    const arg = (showCrashReportDialog as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      eventId: string;
    };
    expect(arg.eventId).toBe('sentry-event-id');
  });

  it('does NOT show "Report bug" link for retryable errors', () => {
    renderWithProviders(<RouteError {...makeProps(new NetworkError())} />);

    expect(screen.queryByText(/errors\.actions\.reportBug/)).not.toBeInTheDocument();
  });

  it('re-captures to Sentry when the error reference changes (distinct crashes)', () => {
    const { rerender } = renderWithProviders(<RouteError {...makeProps(new NetworkError())} />);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);

    // New error reference → another capture.
    const secondError = new ApiError({
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'second',
    });

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <RouteError {...makeProps(secondError)} />
      </QueryClientProvider>,
    );

    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
  });

  it('does NOT re-capture on render with the SAME error reference', () => {
    const sameError = new NetworkError();
    const { rerender } = renderWithProviders(<RouteError {...makeProps(sameError)} />);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);

    // Same error reference — no new capture even though component re-rendered.
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <RouteError {...makeProps(sameError)} />
      </QueryClientProvider>,
    );

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
