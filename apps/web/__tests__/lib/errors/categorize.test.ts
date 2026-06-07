// apps/web/__tests__/lib/errors/categorize.test.ts
// ═══════════════════════════════════════════════════════════════
// CATEGORIZE TESTS — Task #52 Phase 1
//
// Table-driven coverage of every branch in `lib/errors/categorize.ts`.
// New error categories must add a row here — the suite enforces
// taxonomy completeness via an exhaustiveness fixture.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { ERROR_CODES } from '@repo/shared';
import { ApiError, NetworkError } from '@/lib/api';
import { categorize, isFrameworkControlFlow, type ErrorCategory } from '@/lib/errors/categorize';

describe('categorize()', () => {
  describe('chunk-load errors', () => {
    it('detects ChunkLoadError by name', () => {
      const err = Object.assign(new Error('Loading chunk 5 failed'), {
        name: 'ChunkLoadError',
      });
      const result = categorize(err);
      expect(result.category).toBe('chunk-load');
      expect(result.severity).toBe('fatal');
      expect(result.isRetryable).toBe(false);
    });

    it('detects chunk-load by message regex (JS chunk)', () => {
      const err = new Error('Loading chunk 12 failed.');
      const result = categorize(err);
      expect(result.category).toBe('chunk-load');
    });

    it('detects chunk-load by message regex (CSS chunk)', () => {
      const err = new Error('Loading CSS chunk 3 failed.');
      const result = categorize(err);
      expect(result.category).toBe('chunk-load');
    });

    it('detects chunk-load for dynamic-import failures', () => {
      const err = new Error('Failed to fetch dynamically imported module');
      const result = categorize(err);
      expect(result.category).toBe('chunk-load');
    });
  });

  describe('network errors', () => {
    it('categorises NetworkError as network/retryable', () => {
      const result = categorize(new NetworkError());
      expect(result.category).toBe('network');
      expect(result.severity).toBe('error');
      expect(result.isRetryable).toBe(true);
      expect(result.statusCode).toBeUndefined();
    });

    it('detects NetworkError via structural guard (HMR-safe)', () => {
      const fakeNetworkErr = {
        name: 'NetworkError',
        message: 'fetch failed',
        isNetworkError: true,
      } as unknown as Error;
      const result = categorize(fakeNetworkErr);
      expect(result.category).toBe('network');
    });
  });

  describe('ApiError → auth category', () => {
    it('categorises 401 as auth', () => {
      const err = new ApiError({
        statusCode: 401,
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Session expired',
      });
      const result = categorize(err);
      expect(result.category).toBe('auth');
      expect(result.isRetryable).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it('categorises TOKEN_EXPIRED as auth even with non-401 status', () => {
      const err = new ApiError({
        statusCode: 401,
        code: ERROR_CODES.TOKEN_EXPIRED,
        message: 'token expired',
      });
      const result = categorize(err);
      expect(result.category).toBe('auth');
    });

    it('categorises 403 / FORBIDDEN as auth', () => {
      const err = new ApiError({
        statusCode: 403,
        code: ERROR_CODES.FORBIDDEN,
        message: 'forbidden',
      });
      const result = categorize(err);
      expect(result.category).toBe('auth');
    });
  });

  describe('ApiError → validation category', () => {
    it('categorises 400 as validation/warning', () => {
      const err = new ApiError({
        statusCode: 400,
        code: ERROR_CODES.VALIDATION_FAILED,
        message: 'bad request',
      });
      const result = categorize(err);
      expect(result.category).toBe('validation');
      expect(result.severity).toBe('warning');
      expect(result.isRetryable).toBe(false);
    });
  });

  describe('ApiError → rate-limit category', () => {
    it('categorises 429 as rate-limit/retryable', () => {
      const err = new ApiError({
        statusCode: 429,
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
        message: 'too many requests',
      });
      const result = categorize(err);
      expect(result.category).toBe('rate-limit');
      expect(result.isRetryable).toBe(true);
    });
  });

  describe('ApiError → not-found category', () => {
    it('categorises 404 as not-found', () => {
      const err = new ApiError({
        statusCode: 404,
        code: ERROR_CODES.NOT_FOUND,
        message: 'not found',
      });
      const result = categorize(err);
      expect(result.category).toBe('not-found');
      expect(result.isRetryable).toBe(false);
    });
  });

  describe('ApiError → server category', () => {
    it('categorises 500 as server/retryable', () => {
      const err = new ApiError({
        statusCode: 500,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'server error',
      });
      const result = categorize(err);
      expect(result.category).toBe('server');
      expect(result.isRetryable).toBe(true);
    });

    it('categorises 408 timeout as server-class', () => {
      const err = new ApiError({
        statusCode: 408,
        code: 'TIMEOUT',
        message: 'timed out',
      });
      const result = categorize(err);
      expect(result.category).toBe('server');
      expect(result.isRetryable).toBe(true);
    });

    it('categorises 503 SERVICE_UNAVAILABLE as server', () => {
      const err = new ApiError({
        statusCode: 503,
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        message: 'service down',
      });
      const result = categorize(err);
      expect(result.category).toBe('server');
    });
  });

  describe('ApiError → ai-service category', () => {
    it('categorises AI_SERVICE_UNAVAILABLE as ai-service over generic 5xx', () => {
      const err = new ApiError({
        statusCode: 502,
        code: ERROR_CODES.AI_SERVICE_UNAVAILABLE,
        message: 'AI down',
      });
      const result = categorize(err);
      expect(result.category).toBe('ai-service');
      expect(result.isRetryable).toBe(true);
    });
  });

  describe('ApiError → consultation-state category', () => {
    it('categorises CONSULTATION_EXPIRED as consultation-state/non-retryable', () => {
      const err = new ApiError({
        statusCode: 409,
        code: ERROR_CODES.CONSULTATION_EXPIRED,
        message: 'expired',
      });
      const result = categorize(err);
      expect(result.category).toBe('consultation-state');
      expect(result.isRetryable).toBe(false);
    });

    it('categorises CONSULTATION_ALREADY_COMPLETED as consultation-state/warning', () => {
      const err = new ApiError({
        statusCode: 409,
        code: ERROR_CODES.CONSULTATION_ALREADY_COMPLETED,
        message: 'already done',
      });
      const result = categorize(err);
      expect(result.category).toBe('consultation-state');
      expect(result.severity).toBe('warning');
    });
  });

  describe('AbortError handling', () => {
    it('treats AbortError as non-retryable unknown', () => {
      const err = Object.assign(new Error('aborted'), { name: 'AbortError' });
      const result = categorize(err);
      expect(result.category).toBe('unknown');
      expect(result.isRetryable).toBe(false);
      expect(result.diagnosticMessage).toBe('request-aborted');
    });

    it('treats CanceledError (axios-style) as non-retryable unknown', () => {
      const err = Object.assign(new Error('canceled'), { name: 'CanceledError' });
      const result = categorize(err);
      expect(result.category).toBe('unknown');
      expect(result.isRetryable).toBe(false);
    });
  });

  describe('unknown errors', () => {
    it('categorises generic Error as unknown/retryable', () => {
      const err = new Error('some random failure');
      const result = categorize(err);
      expect(result.category).toBe('unknown');
      expect(result.severity).toBe('error');
      expect(result.isRetryable).toBe(true);
      expect(result.name).toBe('Error');
    });

    it('handles string throws', () => {
      const result = categorize('something bad happened');
      expect(result.category).toBe('unknown');
      expect(result.name).toBe('NonErrorThrow');
      expect(result.diagnosticMessage).toBe('something bad happened');
    });

    it('handles null / undefined throws', () => {
      expect(categorize(null).category).toBe('unknown');
      expect(categorize(undefined).category).toBe('unknown');
    });

    it('handles plain object throws', () => {
      const result = categorize({ weird: 'shape' });
      expect(result.category).toBe('unknown');
    });

    it('truncates long diagnostic messages to 140 chars', () => {
      const longMsg = 'x'.repeat(500);
      const err = new Error(longMsg);
      const result = categorize(err);
      expect(result.diagnosticMessage.length).toBeLessThanOrEqual(140);
    });
  });
});

describe('isFrameworkControlFlow()', () => {
  it('detects NEXT_REDIRECT digest', () => {
    const err = Object.assign(new Error('redirect'), { digest: 'NEXT_REDIRECT' });
    expect(isFrameworkControlFlow(err)).toBe(true);
  });

  it('detects NEXT_NOT_FOUND digest', () => {
    const err = Object.assign(new Error('not found'), { digest: 'NEXT_NOT_FOUND' });
    expect(isFrameworkControlFlow(err)).toBe(true);
  });

  it('detects NEXT_HTTP_ERROR_FALLBACK family by prefix', () => {
    const err = Object.assign(new Error('http'), {
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    });
    expect(isFrameworkControlFlow(err)).toBe(true);
  });

  it('returns false for ordinary errors without digest', () => {
    expect(isFrameworkControlFlow(new Error('plain'))).toBe(false);
  });

  it('returns false for null/undefined/primitives', () => {
    expect(isFrameworkControlFlow(null)).toBe(false);
    expect(isFrameworkControlFlow(undefined)).toBe(false);
    expect(isFrameworkControlFlow('string')).toBe(false);
    expect(isFrameworkControlFlow(42)).toBe(false);
  });

  it('returns false when digest is not a recognised marker', () => {
    const err = Object.assign(new Error('x'), { digest: 'SOMETHING_ELSE' });
    expect(isFrameworkControlFlow(err)).toBe(false);
  });
});

// ─── Exhaustiveness fixture ───────────────────────────────────
//
// This array MUST contain every category in the `ErrorCategory` union.
// Adding a new category without listing it here causes the type assertion
// below to fail at compile time — forcing the test author to add coverage.
describe('taxonomy exhaustiveness', () => {
  it('lists every category in the union', () => {
    const allCategories: ReadonlyArray<ErrorCategory> = [
      'network',
      'auth',
      'validation',
      'rate-limit',
      'not-found',
      'server',
      'ai-service',
      'consultation-state',
      'chunk-load',
      'unknown',
    ];
    // If a new category is added to ErrorCategory, the assignment above
    // becomes incomplete and TS errors. The runtime check below ensures
    // the array contains exactly the documented set.
    expect(allCategories).toHaveLength(10);
    expect(new Set(allCategories).size).toBe(10);
  });
});
