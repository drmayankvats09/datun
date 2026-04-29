// ═══════════════════════════════════════════════════════════════
// PHONE PRIMITIVE TESTS — Indian, international, E.164, format helper
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  phoneField,
  indianPhoneField,
  formatPhoneE164,
  COUNTRY_CODES,
} from '../../../validators/primitives/phone.js';

describe('indianPhoneField', () => {
  it('accepts valid Indian number starting with 9', () => {
    expect(indianPhoneField.safeParse('+919876543210').success).toBe(true);
  });

  it('accepts valid Indian number starting with 6', () => {
    expect(indianPhoneField.safeParse('+916234567890').success).toBe(true);
  });

  it('accepts valid Indian number starting with 7', () => {
    expect(indianPhoneField.safeParse('+917890123456').success).toBe(true);
  });

  it('accepts valid Indian number starting with 8', () => {
    expect(indianPhoneField.safeParse('+918765432109').success).toBe(true);
  });

  it('rejects Indian number starting with 5', () => {
    expect(indianPhoneField.safeParse('+915234567890').success).toBe(false);
  });

  it('rejects Indian number starting with 1', () => {
    expect(indianPhoneField.safeParse('+911234567890').success).toBe(false);
  });

  it('rejects Indian number with 9 digits', () => {
    expect(indianPhoneField.safeParse('+91987654321').success).toBe(false);
  });

  it('rejects Indian number with 11 digits', () => {
    expect(indianPhoneField.safeParse('+9198765432101').success).toBe(false);
  });

  it('rejects without +91 prefix', () => {
    expect(indianPhoneField.safeParse('9876543210').success).toBe(false);
  });
});

describe('phoneField (flexible)', () => {
  it('accepts valid Indian number', () => {
    expect(phoneField.safeParse('+919876543210').success).toBe(true);
  });

  it('accepts valid US number', () => {
    expect(phoneField.safeParse('+12125551234').success).toBe(true);
  });

  it('accepts valid UAE number', () => {
    expect(phoneField.safeParse('+971501234567').success).toBe(true);
  });

  it('rejects Indian number starting with invalid digit', () => {
    const result = phoneField.safeParse('+911234567890');
    expect(result.success).toBe(false);
  });

  it('rejects too short number', () => {
    expect(phoneField.safeParse('+1234').success).toBe(false);
  });

  it('rejects number without + prefix', () => {
    expect(phoneField.safeParse('919876543210').success).toBe(false);
  });

  it('rejects number starting with 0', () => {
    expect(phoneField.safeParse('+0123456789').success).toBe(false);
  });

  it('rejects alphabetic characters', () => {
    expect(phoneField.safeParse('+91abcdefghij').success).toBe(false);
  });
});

describe('formatPhoneE164', () => {
  it('formats Indian number with +91', () => {
    expect(formatPhoneE164('+91', '9876543210')).toBe('+919876543210');
  });

  it('strips non-digits from phone', () => {
    expect(formatPhoneE164('+91', '987-654-3210')).toBe('+919876543210');
  });

  it('works with US country code', () => {
    expect(formatPhoneE164('+1', '2125551234')).toBe('+12125551234');
  });

  it('adds + prefix if missing from country code', () => {
    expect(formatPhoneE164('91', '9876543210')).toBe('+919876543210');
  });

  it('handles empty digits', () => {
    expect(formatPhoneE164('+91', '')).toBe('+91');
  });
});

describe('COUNTRY_CODES', () => {
  it('contains India as first entry', () => {
    expect(COUNTRY_CODES[0].code).toBe('91');
    expect(COUNTRY_CODES[0].country).toBe('IN');
  });

  it('has at least 10 countries', () => {
    expect(COUNTRY_CODES.length).toBeGreaterThanOrEqual(10);
  });
});
