// ═══════════════════════════════════════════════════════════════
// PHONE UTILS TESTS — Unit + Property-based
// Tests normalizeIndianPhone() and isValidIndianPhone()
// fast-check generates 1000+ random inputs to find edge cases.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { normalizeIndianPhone, isValidIndianPhone } from '../../utils/phone.js';

describe('normalizeIndianPhone', () => {
  // ── Standard cases ──
  it('handles 10-digit number without country code', () => {
    expect(normalizeIndianPhone('9953135340')).toBe('919953135340');
  });

  it('handles +91 prefix', () => {
    expect(normalizeIndianPhone('+919953135340')).toBe('919953135340');
  });

  it('handles 91 prefix without +', () => {
    expect(normalizeIndianPhone('919953135340')).toBe('919953135340');
  });

  it('handles 0 prefix (landline style)', () => {
    expect(normalizeIndianPhone('09953135340')).toBe('919953135340');
  });

  // ── Edge cases ──
  it('strips spaces', () => {
    expect(normalizeIndianPhone('+91 99531 35340')).toBe('919953135340');
  });

  it('strips dashes', () => {
    expect(normalizeIndianPhone('+91-9953-135-340')).toBe('919953135340');
  });

  it('strips parentheses', () => {
    expect(normalizeIndianPhone('(+91)9953135340')).toBe('919953135340');
  });

  it('strips multiple leading zeros', () => {
    expect(normalizeIndianPhone('009953135340')).toBe('919953135340');
  });

  it('handles empty string', () => {
    expect(normalizeIndianPhone('')).toBe('');
  });

  // ── Property-based: NEVER crashes ──
  it('never throws on any string input (property-based)', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        expect(() => normalizeIndianPhone(input)).not.toThrow();
      }),
      { numRuns: 1000 },
    );
  });

  // ── Property-based: output always starts with 91 for 10-digit inputs ──
  it('output always starts with 91 for valid 10-digit mobile inputs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('6', '7', '8', '9'),
        fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
          minLength: 9,
          maxLength: 9,
        }),
        (firstDigit, rest) => {
          const input = firstDigit + rest.join('');
          const result = normalizeIndianPhone(input);
          expect(result.startsWith('91')).toBe(true);
          expect(result.length).toBeGreaterThanOrEqual(10);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe('isValidIndianPhone', () => {
  it('accepts valid Indian mobile numbers', () => {
    expect(isValidIndianPhone('9953135340')).toBe(true);
    expect(isValidIndianPhone('+919876543210')).toBe(true);
    expect(isValidIndianPhone('6123456789')).toBe(true);
    expect(isValidIndianPhone('7000000000')).toBe(true);
    expect(isValidIndianPhone('8999999999')).toBe(true);
  });

  it('rejects numbers not starting with 6-9', () => {
    expect(isValidIndianPhone('5123456789')).toBe(false);
    expect(isValidIndianPhone('1234567890')).toBe(false);
    expect(isValidIndianPhone('0123456789')).toBe(false);
  });

  it('rejects numbers with wrong length', () => {
    expect(isValidIndianPhone('99531')).toBe(false);
    expect(isValidIndianPhone('99531353401234')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidIndianPhone('')).toBe(false);
  });
});
