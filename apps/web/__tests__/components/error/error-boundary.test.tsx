// apps/web/__tests__/components/error/error-boundary.test.tsx
// ═══════════════════════════════════════════════════════════════
// ERROR BOUNDARY TESTS — Task #52 Phase 2
//
// Coverage:
//   1. Renders children when no error
//   2. Catches a render-time throw and renders fallback (ReactNode + render-prop)
//   3. Re-throws framework control flow (NEXT_REDIRECT etc.) — does NOT swallow
//   4. Calls onError with categorised data
//   5. Calls Sentry.captureException with category + level tags
//   6. resetBoundary clears state and calls onReset
//   7. resetKeys auto-resets on change
//   8. Coerces non-Error throws (string, plain object) to Error
//   9. Default fallback renders when none provided
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// ── Mock Sentry before importing the boundary ──
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(() => 'test-event-id-abc'),
  lastEventId: vi.fn(() => 'test-event-id-abc'),
}));

// ── Mock audit log to prevent real fetches in tests ──
vi.mock('@/lib/errors', async () => {
  const actual = await vi.importActual<typeof import('@/lib/errors')>('@/lib/errors');
  return {
    ...actual,
    logErrorToAudit: vi.fn(),
    getAuditSessionId: vi.fn(() => 'session-test'),
  };
});

import * as Sentry from '@sentry/nextjs';
import { logErrorToAudit } from '@/lib/errors';
import { ErrorBoundary } from '@/components/a11y/error-boundary';

// ─── Test helpers ──────────────────────────────────────────────

/** Component that throws on first render. */
function Bomb({ message = 'boom!' }: { message?: string }): React.ReactElement {
  throw new Error(message);
}

/** Component that throws a framework control-flow throw. */
function NextRedirectBomb(): React.ReactElement {
  const err = Object.assign(new Error('redirect'), { digest: 'NEXT_REDIRECT' });
  throw err;
}

/** Component that throws a non-Error value. */
function StringBomb(): React.ReactElement {
  throw 'string-error';
}

// Suppress React 19's noisy "uncaught error" log during tests — those
// logs are expected output for boundary tests and would pollute CI.
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

describe('<ErrorBoundary />', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <p>OK</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('catches a render-time throw and renders the default fallback', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    // Default fallback contains "Try again" button.
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders a ReactNode fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<p>Static fallback</p>}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Static fallback')).toBeInTheDocument();
  });

  it('renders a render-prop fallback with full props', () => {
    const fallback = vi.fn(({ error, categorised, eventId, resetBoundary }) => (
      <div>
        <p data-testid="message">{error.message}</p>
        <p data-testid="category">{categorised.category}</p>
        <p data-testid="event-id">{eventId}</p>
        <button type="button" onClick={resetBoundary}>
          Reset
        </button>
      </div>
    ));

    render(
      <ErrorBoundary fallback={fallback}>
        <Bomb message="render-prop test" />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('message')).toHaveTextContent('render-prop test');
    expect(screen.getByTestId('category')).toHaveTextContent('unknown');
    expect(screen.getByTestId('event-id')).toHaveTextContent('test-event-id-abc');
    expect(fallback).toHaveBeenCalled();
  });

  it('re-throws Next.js framework control flow (NEXT_REDIRECT)', () => {
    // The framework throw should propagate UP, not be caught.
    // React 19's error boundary still catches it once (so getDerivedStateFromError
    // sees it), but our implementation re-throws from inside.
    expect(() =>
      render(
        <ErrorBoundary>
          <NextRedirectBomb />
        </ErrorBoundary>,
      ),
    ).toThrow();
  });

  it('coerces a string throw into an Error and renders fallback', () => {
    render(
      <ErrorBoundary fallback={({ error }) => <p data-testid="message">{error.message}</p>}>
        <StringBomb />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('message')).toHaveTextContent('string-error');
  });

  it('calls Sentry.captureException with category + level tags', () => {
    render(
      <ErrorBoundary level="feature">
        <Bomb message="sentry-test" />
      </ErrorBoundary>,
    );

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [errorArg, optionsArg] = (Sentry.captureException as ReturnType<typeof vi.fn>).mock
      .calls[0] as [Error, { tags: Record<string, string> }];

    expect(errorArg).toBeInstanceOf(Error);
    expect(errorArg.message).toBe('sentry-test');
    expect(optionsArg.tags).toMatchObject({
      'error.category': 'unknown',
      'boundary.level': 'feature',
    });
  });

  it('ships an audit log entry with the right boundaryLevel', () => {
    render(
      <ErrorBoundary level="route">
        <Bomb />
      </ErrorBoundary>,
    );

    expect(logErrorToAudit).toHaveBeenCalledTimes(1);
    const payload = (logErrorToAudit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      boundaryLevel: string;
      sessionId: string;
    };
    expect(payload.boundaryLevel).toBe('route');
    expect(payload.sessionId).toBe('session-test');
  });

  it('calls onError with normalised error + categorised data', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Bomb message="on-error-test" />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    const [err, info, cat] = onError.mock.calls[0] as [
      Error,
      React.ErrorInfo,
      { category: string },
    ];
    expect(err.message).toBe('on-error-test');
    expect(info).toHaveProperty('componentStack');
    expect(cat.category).toBe('unknown');
  });

  it('resetBoundary clears state and calls onReset', () => {
    const onReset = vi.fn();

    function Recoverable({ throwIt }: { throwIt: boolean }): React.ReactElement {
      if (throwIt) throw new Error('first-render-boom');
      return <p>healed</p>;
    }

    function TestHarness(): React.ReactElement {
      const [throwIt, setThrowIt] = React.useState(true);
      return (
        <ErrorBoundary
          onReset={() => {
            onReset();
            setThrowIt(false);
          }}
          fallback={({ resetBoundary }) => (
            <button type="button" onClick={resetBoundary} data-testid="reset-btn">
              try
            </button>
          )}
        >
          <Recoverable throwIt={throwIt} />
        </ErrorBoundary>
      );
    }

    render(<TestHarness />);
    expect(screen.getByTestId('reset-btn')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reset-btn'));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText('healed')).toBeInTheDocument();
  });

  it('auto-resets when resetKeys change', () => {
    function Bomby({ value }: { value: number }): React.ReactElement {
      if (value === 0) throw new Error('value-0');
      return <p>value-{value}</p>;
    }

    function Harness(): React.ReactElement {
      const [v, setV] = React.useState(0);
      return (
        <div>
          <button type="button" onClick={() => setV(1)} data-testid="bump">
            bump
          </button>
          <ErrorBoundary resetKeys={[v]} fallback={<p data-testid="fallback">FALLBACK</p>}>
            <Bomby value={v} />
          </ErrorBoundary>
        </div>
      );
    }

    render(<Harness />);
    expect(screen.getByTestId('fallback')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('bump'));

    // The boundary auto-resets due to resetKeys change AND the new
    // value=1 doesn't throw — so we see the healthy render.
    expect(screen.getByText('value-1')).toBeInTheDocument();
  });
});
