// ═══════════════════════════════════════════════════════════════
// EMAIL PRIMITIVE TESTS — Format, normalization, disposable block
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { emailField, DISPOSABLE_DOMAINS } from '../../../validators/primitives/email.js';

describe('emailField', () => {
  // ── Valid Emails ──

  it('accepts standard email', () => {
    expect(emailField.parse('test@datunai.com')).toBe('test@datunai.com');
  });

  it('accepts email with subdomain', () => {
    expect(emailField.parse('user@mail.datunai.com')).toBe('user@mail.datunai.com');
  });

  it('accepts email with dots in local part', () => {
    expect(emailField.parse('dr.mayank.vats@gmail.com')).toBe('dr.mayank.vats@gmail.com');
  });

  it('accepts email with plus addressing', () => {
    expect(emailField.parse('user+tag@gmail.com')).toBe('user+tag@gmail.com');
  });

  // ── Auto-lowercase ──

  it('lowercases uppercase email', () => {
    expect(emailField.parse('Test@Datunai.COM')).toBe('test@datunai.com');
  });

  it('lowercases mixed case', () => {
    expect(emailField.parse('DR.MAYANK@Gmail.Com')).toBe('dr.mayank@gmail.com');
  });

  // ── Auto-trim ──

  it('trims leading/trailing whitespace', () => {
    expect(emailField.parse('  test@datunai.com  ')).toBe('test@datunai.com');
  });

  // ── Invalid Formats ──

  it('rejects empty string', () => {
    expect(emailField.safeParse('').success).toBe(false);
  });

  it('rejects missing @', () => {
    expect(emailField.safeParse('testdatunai.com').success).toBe(false);
  });

  it('rejects missing domain', () => {
    expect(emailField.safeParse('test@').success).toBe(false);
  });

  it('rejects missing local part', () => {
    expect(emailField.safeParse('@datunai.com').success).toBe(false);
  });

  it('rejects spaces in email', () => {
    expect(emailField.safeParse('test @datunai.com').success).toBe(false);
  });

  // ── Max Length ──

  it('rejects email exceeding 254 characters', () => {
    const longLocal = 'a'.repeat(250);
    expect(emailField.safeParse(`${longLocal}@x.com`).success).toBe(false);
  });

  it('accepts long but valid email under 254 characters', () => {
    const local = 'a'.repeat(60); // 60 chars (under 64 local part limit)
    const domain = 'mail.datunai.com';
    const email = `${local}@${domain}`; // 60 + 1 + 16 = 77
    expect(emailField.safeParse(email).success).toBe(true);
  });

  // ── Disposable Email Blocking ──

  it('rejects mailinator.com', () => {
    const result = emailField.safeParse('spam@mailinator.com');
    expect(result.success).toBe(false);
  });

  it('rejects guerrillamail.com', () => {
    const result = emailField.safeParse('temp@guerrillamail.com');
    expect(result.success).toBe(false);
  });

  it('rejects yopmail.com', () => {
    const result = emailField.safeParse('fake@yopmail.com');
    expect(result.success).toBe(false);
  });

  it('rejects 10minutemail.com', () => {
    const result = emailField.safeParse('throwaway@10minutemail.com');
    expect(result.success).toBe(false);
  });

  it('allows gmail.com (not disposable)', () => {
    expect(emailField.safeParse('user@gmail.com').success).toBe(true);
  });

  it('allows datunai.com (not disposable)', () => {
    expect(emailField.safeParse('dr.mayank@datunai.com').success).toBe(true);
  });

  // ── Disposable list sanity ──

  it('disposable domains list has at least 20 entries', () => {
    expect(DISPOSABLE_DOMAINS.size).toBeGreaterThanOrEqual(20);
  });

  // ── Non-string input ──

  it('rejects number input', () => {
    expect(emailField.safeParse(12345).success).toBe(false);
  });

  it('rejects null', () => {
    expect(emailField.safeParse(null).success).toBe(false);
  });

  it('rejects undefined', () => {
    expect(emailField.safeParse(undefined).success).toBe(false);
  });
});
