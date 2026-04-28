// ═══════════════════════════════════════════════════════════════
// OFFLINE STATE TESTS — Default props + i18n props + retry
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineState } from '../../components/feedback/offline-state';

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { ...window.location, reload: mockReload },
  writable: true,
  configurable: true,
});

describe('OfflineState', () => {
  // ── Default Props ──

  it('renders default title', () => {
    render(<OfflineState />);
    expect(screen.getByText("You're Offline")).toBeInTheDocument();
  });

  it('renders default message', () => {
    render(<OfflineState />);
    expect(
      screen.getByText("You're offline. Some features may be unavailable until you reconnect."),
    ).toBeInTheDocument();
  });

  it('renders default retry button label', () => {
    render(<OfflineState />);
    expect(screen.getByText('Retry connection')).toBeInTheDocument();
  });

  it('renders offline emoji icon', () => {
    render(<OfflineState />);
    expect(screen.getByText('📡')).toBeInTheDocument();
  });

  // ── Custom Props (i18n) ──

  it('accepts custom title for Hindi locale', () => {
    render(<OfflineState title="आप ऑफ़लाइन हैं" />);
    expect(screen.getByText('आप ऑफ़लाइन हैं')).toBeInTheDocument();
  });

  it('accepts custom message', () => {
    render(<OfflineState message="Custom offline message" />);
    expect(screen.getByText('Custom offline message')).toBeInTheDocument();
  });

  it('accepts custom retry label for Hindi', () => {
    render(<OfflineState retryLabel="पुनः प्रयास करें" />);
    expect(screen.getByText('पुनः प्रयास करें')).toBeInTheDocument();
  });

  // ── Retry Button ──

  it('calls window.location.reload on retry click', async () => {
    mockReload.mockClear();
    render(<OfflineState />);
    const retryButton = screen.getByText('Retry connection');

    await userEvent.click(retryButton);

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  // ── className forwarding ──

  it('applies custom className', () => {
    const { container } = render(<OfflineState className="mt-10" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('mt-10');
  });

  // ── Semantic HTML ──

  it('heading is h3', () => {
    render(<OfflineState />);
    const heading = screen.getByText("You're Offline");
    expect(heading.tagName).toBe('H3');
  });
});
