// apps/web/__tests__/app/locale/not-found.test.tsx
// ═══════════════════════════════════════════════════════════════
// LOCALE 404 PAGE TESTS — Task #52 Phase 3
//
// Coverage:
//   1. Renders 404 status badge
//   2. Renders title + description from errors.notFound namespace
//   3. Renders 3 popular destinations (home, consult, login)
//   4. Renders the primary "Go home" CTA pointing at /
//   5. Renders the feedback link with feedbackPrompt label
//   6. Clicking the feedback link opens the Sentry crash report dialog
//   7. Renders the NotFoundIllustration
//
// Why a single test file for two source files:
//   not-found.tsx + not-found-feedback-link.tsx render together. We
//   mock the feedback dialog at the import level and validate the
//   full page from the user's POV (React Testing Library philosophy:
//   test as the user, not as the internals).
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// ── Mock the Sentry feedback dialog ──
vi.mock('@/lib/sentry/feedback', () => ({
  showCrashReportDialog: vi.fn(),
}));

import { showCrashReportDialog } from '@/lib/sentry/feedback';
import NotFound from '@/app/[locale]/not-found';

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
});

describe('<NotFound /> (locale 404 page)', () => {
  it('renders the 404 status badge', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders the title and description from the errors.notFound namespace', () => {
    render(<NotFound />);

    // The test mock for useTranslations returns the namespaced key,
    // so we expect `errors.notFound.title` to appear in the document.
    expect(screen.getByText(/errors\.notFound\.title/)).toBeInTheDocument();
    expect(screen.getByText(/errors\.notFound\.description/)).toBeInTheDocument();
  });

  it('renders all three popular destinations (home, consult, signin)', () => {
    render(<NotFound />);

    // The destinations heading label.
    expect(screen.getByText(/errors\.notFound\.popular/)).toBeInTheDocument();

    // Each destination link.
    expect(screen.getByText(/errors\.notFound\.destinations\.home/)).toBeInTheDocument();
    expect(screen.getByText(/errors\.notFound\.destinations\.consult/)).toBeInTheDocument();
    expect(screen.getByText(/errors\.notFound\.destinations\.signin/)).toBeInTheDocument();
  });

  it('renders the primary "Go home" CTA linking to /', () => {
    render(<NotFound />);

    // Find the CTA — there are TWO "go home" link elements (the
    // destination card + the primary CTA). Both should target /.
    const homeLinks = screen
      .getAllByRole('link')
      .filter((el) => (el as HTMLAnchorElement).getAttribute('href') === '/');
    expect(homeLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the feedback link with the feedbackPrompt label', () => {
    render(<NotFound />);
    expect(screen.getByText(/errors\.notFound\.feedbackPrompt/)).toBeInTheDocument();
  });

  it('opens the Sentry crash report dialog when feedback link is clicked', () => {
    render(<NotFound />);

    const feedbackLink = screen.getByText(/errors\.notFound\.feedbackPrompt/);
    fireEvent.click(feedbackLink);

    expect(showCrashReportDialog).toHaveBeenCalledTimes(1);
    const arg = (showCrashReportDialog as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      eventId: string | null;
    };
    // The 404 page passes eventId=null — the SDK falls back to
    // generating a synthetic event for the feedback.
    expect(arg.eventId).toBeNull();
  });

  it('renders the NotFoundIllustration', () => {
    render(<NotFound />);

    // The illustration includes a <title> element — we can assert on
    // its accessible name to verify it rendered.
    expect(screen.getByTitle(/page not found/i)).toBeInTheDocument();
  });

  it('uses role="main" for the page container (a11y)', () => {
    render(<NotFound />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
