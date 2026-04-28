// ═══════════════════════════════════════════════════════════════
// PHONE INPUT TESTS — Digit filtering + country code + E.164
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhoneInput, formatPhoneE164 } from '../../components/phone-input';

describe('PhoneInput', () => {
  it('renders with +91 country code by default', () => {
    render(<PhoneInput value="" onChange={vi.fn()} />);
    expect(screen.getByText('+91')).toBeInTheDocument();
  });

  it('renders custom country code', () => {
    render(<PhoneInput value="" onChange={vi.fn()} countryCode="+1" />);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('shows current value in input', () => {
    render(<PhoneInput value="9876543210" onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('9876543210');
  });

  it('calls onChange with digits only (strips non-numeric)', async () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} />);
    const input = screen.getByRole('textbox');

    await userEvent.type(input, 'abc123def456');

    // onChange should have been called with only digits
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    expect(lastCall?.[0]).toMatch(/^\d*$/);
  });

  it('enforces maxDigits (default 10)', async () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} />);
    const input = screen.getByRole('textbox');

    await userEvent.type(input, '12345678901234');

    // All onChange calls should have value length <= 10
    for (const call of onChange.mock.calls) {
      expect(call[0].length).toBeLessThanOrEqual(10);
    }
  });

  it('has inputMode="numeric" for mobile keyboards', () => {
    render(<PhoneInput value="" onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('inputMode', 'numeric');
  });

  it('has type="tel" for semantic HTML', () => {
    render(<PhoneInput value="" onChange={vi.fn()} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'tel');
  });

  it('country code div is aria-hidden (decorative)', () => {
    render(<PhoneInput value="" onChange={vi.fn()} />);
    expect(screen.getByText('+91')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('formatPhoneE164', () => {
  it('formats Indian phone number to E.164', () => {
    expect(formatPhoneE164('+91', '9876543210')).toBe('+919876543210');
  });

  it('strips non-digits from phone number', () => {
    expect(formatPhoneE164('+91', '987-654-3210')).toBe('+919876543210');
  });

  it('works with US country code', () => {
    expect(formatPhoneE164('+1', '2125551234')).toBe('+12125551234');
  });

  it('handles empty digits', () => {
    expect(formatPhoneE164('+91', '')).toBe('+91');
  });
});
