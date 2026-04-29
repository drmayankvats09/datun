// ═══════════════════════════════════════════════════════════════
// OTP PRIMITIVE TESTS — 6-digit numeric validation
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { otpField, OTP_CONFIG } from '../../../validators/primitives/otp.js';

describe('otpField', () => {
  it('accepts valid 6-digit OTP', () => {
    expect(otpField.safeParse('123456').success).toBe(true);
  });

  it('accepts OTP with leading zeros', () => {
    expect(otpField.safeParse('000001').success).toBe(true);
  });

  it('accepts all zeros', () => {
    expect(otpField.safeParse('000000').success).toBe(true);
  });

  it('rejects 5-digit OTP', () => {
    expect(otpField.safeParse('12345').success).toBe(false);
  });

  it('rejects 7-digit OTP', () => {
    expect(otpField.safeParse('1234567').success).toBe(false);
  });

  it('rejects non-numeric OTP', () => {
    expect(otpField.safeParse('abcdef').success).toBe(false);
  });

  it('rejects mixed alphanumeric', () => {
    expect(otpField.safeParse('12ab56').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(otpField.safeParse('').success).toBe(false);
  });

  it('rejects spaces', () => {
    expect(otpField.safeParse('12 456').success).toBe(false);
  });

  it('rejects special characters', () => {
    expect(otpField.safeParse('12-456').success).toBe(false);
  });
});

describe('OTP_CONFIG', () => {
  it('OTP length is 6', () => {
    expect(OTP_CONFIG.length).toBe(6);
  });

  it('expiry is 300 seconds (5 min)', () => {
    expect(OTP_CONFIG.expirySeconds).toBe(300);
  });

  it('max attempts is 5', () => {
    expect(OTP_CONFIG.maxAttempts).toBe(5);
  });
});
