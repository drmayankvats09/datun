// ═══════════════════════════════════════════════════════════════
// PASSWORD PRIMITIVE TESTS — Strength rules, boundary, login variant
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  passwordField,
  loginPasswordField,
  PASSWORD_RULES,
} from '../../../validators/primitives/password.js';

describe('passwordField (strong — signup/reset)', () => {
  // ── Valid ──

  it('accepts password meeting all rules', () => {
    expect(passwordField.safeParse('StrongPass1').success).toBe(true);
  });

  it('accepts password with special characters', () => {
    expect(passwordField.safeParse('Str0ng!@#$%').success).toBe(true);
  });

  it('accepts password at minimum length (8 chars)', () => {
    expect(passwordField.safeParse('Abcdefg1').success).toBe(true);
  });

  it('accepts long password (128 chars)', () => {
    const long = 'Aa1' + 'x'.repeat(125);
    expect(passwordField.safeParse(long).success).toBe(true);
  });

  // ── Missing Rules ──

  it('rejects password without uppercase', () => {
    const result = passwordField.safeParse('alllowercase1');
    expect(result.success).toBe(false);
  });

  it('rejects password without lowercase', () => {
    const result = passwordField.safeParse('ALLUPPERCASE1');
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = passwordField.safeParse('NoNumberHere');
    expect(result.success).toBe(false);
  });

  it('rejects password too short (7 chars)', () => {
    const result = passwordField.safeParse('Short1A');
    expect(result.success).toBe(false);
  });

  it('rejects password exceeding 128 chars', () => {
    const tooLong = 'Aa1' + 'x'.repeat(126);
    expect(tooLong.length).toBe(129);
    expect(passwordField.safeParse(tooLong).success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(passwordField.safeParse('').success).toBe(false);
  });

  // ── Config Constants ──

  it('PASSWORD_RULES has correct defaults', () => {
    expect(PASSWORD_RULES.minLength).toBe(8);
    expect(PASSWORD_RULES.maxLength).toBe(128);
    expect(PASSWORD_RULES.requireUppercase).toBe(true);
    expect(PASSWORD_RULES.requireLowercase).toBe(true);
    expect(PASSWORD_RULES.requireDigit).toBe(true);
  });
});

describe('loginPasswordField (lenient — login only)', () => {
  it('accepts any non-empty password', () => {
    expect(loginPasswordField.safeParse('weak').success).toBe(true);
  });

  it('accepts password without uppercase (old accounts)', () => {
    expect(loginPasswordField.safeParse('alllowercase123').success).toBe(true);
  });

  it('rejects empty password', () => {
    expect(loginPasswordField.safeParse('').success).toBe(false);
  });

  it('rejects password exceeding 128 chars', () => {
    const tooLong = 'x'.repeat(129);
    expect(loginPasswordField.safeParse(tooLong).success).toBe(false);
  });
});
