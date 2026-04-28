// ═══════════════════════════════════════════════════════════════
// LOADING BUTTON TESTS — State management + accessibility
// Verifies: disabled during load, aria-busy, width stability,
// screen reader label, custom loading text.
// Pattern: shadcn/ui component test pattern.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingButton } from '../../components/feedback/loading-button';

describe('LoadingButton', () => {
  // ── Default State (not loading) ──

  it('renders children when not loading', () => {
    render(<LoadingButton>Submit</LoadingButton>);
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('is not disabled when not loading', () => {
    render(<LoadingButton>Submit</LoadingButton>);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('has aria-busy=false when not loading', () => {
    render(<LoadingButton>Submit</LoadingButton>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false');
  });

  it('does not show spinner when not loading', () => {
    render(<LoadingButton>Submit</LoadingButton>);
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });

  // ── Loading State ──

  it('is disabled when loading', () => {
    render(<LoadingButton loading>Submit</LoadingButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('has aria-busy=true when loading', () => {
    render(<LoadingButton loading>Submit</LoadingButton>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows sr-only "Loading" label for screen readers', () => {
    render(<LoadingButton loading>Submit</LoadingButton>);
    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByText('Loading')).toHaveClass('sr-only');
  });

  it('supports custom sr-only label via srLoadingLabel prop', () => {
    render(
      <LoadingButton loading srLoadingLabel="Saving...">
        Submit
      </LoadingButton>,
    );
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows loadingText when provided', () => {
    render(
      <LoadingButton loading loadingText="Please wait">
        Submit
      </LoadingButton>,
    );
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  // ── Children visibility (layout shift prevention) ──

  it('makes children invisible (not removed) during loading', () => {
    render(<LoadingButton loading>Submit</LoadingButton>);
    // Children span should have 'invisible' class — present in DOM but hidden
    // This maintains button width (prevents layout shift)
    const childSpan = screen.getByText('Submit').closest('span');
    expect(childSpan).toHaveClass('invisible');
  });

  it('children are visible when not loading', () => {
    render(<LoadingButton>Submit</LoadingButton>);
    const childSpan = screen.getByText('Submit').closest('span');
    expect(childSpan).not.toHaveClass('invisible');
  });

  // ── Disabled prop (separate from loading) ──

  it('respects disabled prop independently of loading', () => {
    render(<LoadingButton disabled>Submit</LoadingButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when BOTH loading and disabled are true', () => {
    render(
      <LoadingButton loading disabled>
        Submit
      </LoadingButton>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  // ── Type prop ──

  it('passes type="submit" through', () => {
    render(<LoadingButton type="submit">Go</LoadingButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
