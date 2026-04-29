import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createErrorMap, ERROR_MAP_LOCALES } from '../../../validators/error-map';

describe('createErrorMap — English', () => {
  it('returns email error message', () => {
    const errorMap = createErrorMap('en');
    const schema = z.string().email();
    const prev = z.defaultErrorMap;
    z.setErrorMap(errorMap);
    const result = schema.safeParse('not-email');
    z.setErrorMap(prev);
    expect(result.success).toBe(false);
    if (!result.success && result.error.issues[0]) {
      expect(result.error.issues[0].message.length).toBeGreaterThan(0);
    }
  });

  it('returns too_small message', () => {
    const errorMap = createErrorMap('en');
    const schema = z.string().min(5);
    const prev = z.defaultErrorMap;
    z.setErrorMap(errorMap);
    const result = schema.safeParse('ab');
    z.setErrorMap(prev);
    expect(result.success).toBe(false);
  });
});

describe('createErrorMap — Hindi', () => {
  it('returns Hindi email error', () => {
    const errorMap = createErrorMap('hi');
    const schema = z.string().email();
    const prev = z.defaultErrorMap;
    z.setErrorMap(errorMap);
    const result = schema.safeParse('not-email');
    z.setErrorMap(prev);
    expect(result.success).toBe(false);
    if (!result.success && result.error.issues[0]) {
      expect(result.error.issues[0].message).toContain('ईमेल');
    }
  });

  it('returns Hindi min length error', () => {
    const errorMap = createErrorMap('hi');
    const schema = z.string().min(8);
    const prev = z.defaultErrorMap;
    z.setErrorMap(errorMap);
    const result = schema.safeParse('ab');
    z.setErrorMap(prev);
    expect(result.success).toBe(false);
    if (!result.success && result.error.issues[0]) {
      expect(result.error.issues[0].message).toContain('कम से कम');
      expect(result.error.issues[0].message).toContain('8');
    }
  });

  it('returns Hindi max length error', () => {
    const errorMap = createErrorMap('hi');
    const schema = z.string().max(3);
    const prev = z.defaultErrorMap;
    z.setErrorMap(errorMap);
    const result = schema.safeParse('abcdef');
    z.setErrorMap(prev);
    expect(result.success).toBe(false);
    if (!result.success && result.error.issues[0]) {
      expect(result.error.issues[0].message).toContain('अधिक');
    }
  });
});

describe('createErrorMap — Fallback', () => {
  it('falls back to English for unsupported locale', () => {
    const errorMap = createErrorMap('fr');
    const schema = z.string().email();
    const prev = z.defaultErrorMap;
    z.setErrorMap(errorMap);
    const result = schema.safeParse('bad');
    z.setErrorMap(prev);
    expect(result.success).toBe(false);
    if (!result.success && result.error.issues[0]) {
      expect(result.error.issues[0].message.length).toBeGreaterThan(0);
    }
  });

  it('does not crash for empty locale', () => {
    const errorMap = createErrorMap('');
    expect(typeof errorMap).toBe('function');
  });
});

describe('ERROR_MAP_LOCALES', () => {
  it('includes en and hi', () => {
    expect(ERROR_MAP_LOCALES).toContain('en');
    expect(ERROR_MAP_LOCALES).toContain('hi');
  });

  it('has at least 2 locales', () => {
    expect(ERROR_MAP_LOCALES.length).toBeGreaterThanOrEqual(2);
  });
});
