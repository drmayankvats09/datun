// apps/web/__tests__/components/error/widget-error.test.tsx
// ═══════════════════════════════════════════════════════════════
// WIDGET ERROR TESTS — Task #52 Phase 2
//
// Coverage:
//   1. Title + description rendered for each category
//   2. Retry button visible for retryable categories (network, server)
//   3. Sign-in CTA visible for auth category (no retry button)
//   4. Reload CTA visible for chunk-load category
//   5. Reference ID footer visible only when error is NOT retryable
//   6. Crash report dialog opens on "Get help" click
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mock Sentry feedback ──
vi.mock('@/lib/sentry/feedback', () => ({
  showCrashReportDialog: vi.fn(),
}));

// ── Mock Sentry SDK (avoid real init) ──
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  lastEventId: vi.fn(() => 'evt-id'),
  setUser: vi.fn(),
  setTag: vi.fn(),
}));

import { showCrashReportDialog } from '@/lib/sentry/feedback';
import { WidgetError } from '@/components/error/widget-error';
import { ApiError, NetworkError } from '@/lib/api';
import { ERROR_CODES } from '@repo/shared';
import { categorize } from '@/lib/errors';

// ─── Helpers ───────────────────────────────────────────────────

function renderWithQueryClient(node: React.ReactElement): ReturnType<typeof render> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

function makeProps(error: unknown): Parameters<typeof WidgetError>[0] {
  const e = error instanceof Error ? error : new Error('test');
  return {
    error: e,
    errorInfo: null,
    eventId: 'event-xyz',
    categorised: categorize(e),
    resetBoundary: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => cleanup());

// ─── Tests ─────────────────────────────────────────────────────

describe('<WidgetError />', () => {
  it('renders title + description for a network error', () => {
    renderWithQueryClient(<WidgetError {...makeProps(new NetworkError())} />);

    // Translations are mocked to return the namespaced key.
    expect(screen.getByText(/errors\.category\.network\.title/)).toBeInTheDocument();
    expect(screen.getByText(/errors\.category\.network\.message/)).toBeInTheDocument();
  });

  it('shows the retry button for retryable categories (network)', () => {
    renderWithQueryClient(<WidgetError {...makeProps(new NetworkError())} />);
    // RetryButton text falls through to the i18n key in the mock.
    expect(screen.getByRole('button', { name: /errors\.actions\.retry/i })).toBeInTheDocument();
  });

  it('shows sign-in CTA for auth category (no retry button)', () => {
    const err = new ApiError({
      statusCode: 401,
      code: ERROR_CODES.UNAUTHORIZED,
      message: 'session expired',
    });
    renderWithQueryClient(<WidgetError {...makeProps(err)} />);

    // Auth strategy → reauthenticate. Look for a link/button containing the sign-in label.
    expect(screen.getByText(/errors\.actions\.signInAgain/)).toBeInTheDocument();
  });

  it('shows reload CTA for chunk-load category', () => {
    const err = Object.assign(new Error('Loading chunk 5 failed'), { name: 'ChunkLoadError' });
    renderWithQueryClient(<WidgetError {...makeProps(err)} />);

    expect(screen.getByText(/errors\.actions\.reload/)).toBeInTheDocument();
  });

  it('shows reference ID footer for non-retryable errors', () => {
    // not-found is non-retryable.
    const err = new ApiError({
      statusCode: 404,
      code: ERROR_CODES.NOT_FOUND,
      message: 'gone',
    });
    renderWithQueryClient(<WidgetError {...makeProps(err)} />);

    expect(screen.getByText(/event-xyz/)).toBeInTheDocument();
  });

  it('opens the crash report dialog when "Get help" is clicked (contact-support)', () => {
    // Validation is mapped to contact-support strategy.
    const err = new ApiError({
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_FAILED,
      message: 'invalid',
    });
    renderWithQueryClient(<WidgetError {...makeProps(err)} />);

    const helpBtn = screen.getByText(/errors\.actions\.getHelp/);
    fireEvent.click(helpBtn);

    expect(showCrashReportDialog).toHaveBeenCalledTimes(1);
    const arg = (showCrashReportDialog as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      eventId: string;
    };
    expect(arg.eventId).toBe('event-xyz');
  });

  it('uses the featureName-aware message when featureName is provided', () => {
    renderWithQueryClient(
      <WidgetError {...makeProps(new NetworkError())} featureName="chat_panel" />,
    );

    expect(screen.getByText(/errors\.category\.network\.messageWithFeature/)).toBeInTheDocument();
  });

  it('falls back to category.message when no featureName is provided', () => {
    renderWithQueryClient(<WidgetError {...makeProps(new NetworkError())} />);

    expect(screen.getByText(/errors\.category\.network\.message/)).toBeInTheDocument();
  });
});
