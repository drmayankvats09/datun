// ═══════════════════════════════════════════════════════════════
// DATE PRIMITIVE TESTS — ISO 8601, DOB range, future date
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { dateField, dobField, futureDateField } from '../../../validators/primitives/date.js';

describe('dateField (generic ISO 8601)', () => {
  it('accepts date-only string', () => {
    expect(dateField.safeParse('2024-03-15').success).toBe(true);
  });

  it('accepts datetime with Z', () => {
    expect(dateField.safeParse('2024-03-15T10:30:00Z').success).toBe(true);
  });

  it('accepts datetime with IST offset', () => {
    expect(dateField.safeParse('2024-03-15T16:00:00+05:30').success).toBe(true);
  });

  it('rejects invalid date string', () => {
    expect(dateField.safeParse('not-a-date').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(dateField.safeParse('').success).toBe(false);
  });

  it('rejects number input', () => {
    expect(dateField.safeParse(12345).success).toBe(false);
  });
});

describe('dobField (date of birth)', () => {
  it('accepts valid past date', () => {
    expect(dobField.safeParse('1998-05-15').success).toBe(true);
  });

  it('accepts date in 1900', () => {
    expect(dobField.safeParse('1900-01-01').success).toBe(true);
  });

  it('rejects date before 1900', () => {
    expect(dobField.safeParse('1899-12-31').success).toBe(false);
  });

  it('rejects future date (born tomorrow)', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(dobField.safeParse(tomorrow.toISOString()).success).toBe(false);
  });

  it('rejects year 2030', () => {
    expect(dobField.safeParse('2030-01-01').success).toBe(false);
  });

  it('rejects invalid date string', () => {
    expect(dobField.safeParse('abc').success).toBe(false);
  });
});

describe('futureDateField (appointments)', () => {
  it('accepts date 1 hour from now', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    expect(futureDateField.safeParse(future.toISOString()).success).toBe(true);
  });

  it('accepts date 6 months from now', () => {
    const future = new Date();
    future.setMonth(future.getMonth() + 6);
    expect(futureDateField.safeParse(future.toISOString()).success).toBe(true);
  });

  it('rejects past date', () => {
    expect(futureDateField.safeParse('2020-01-01').success).toBe(false);
  });

  it('rejects date more than 1 year out', () => {
    const tooFar = new Date();
    tooFar.setFullYear(tooFar.getFullYear() + 2);
    expect(futureDateField.safeParse(tooFar.toISOString()).success).toBe(false);
  });
});
