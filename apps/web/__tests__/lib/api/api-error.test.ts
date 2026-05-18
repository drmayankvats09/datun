// apps/web/__tests__/lib/api/api-error.test.ts
// ═══════════════════════════════════════════════════════════════
// ApiError / NetworkError / Type-Guards — Unit Tests
// Task #47 Phase 3
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { ApiError, NetworkError, isApiError, isNetworkError } from '@/lib/api';
import { ERROR_CODES } from '@repo/shared';

describe('ApiError', () => {
  it('exposes statusCode, code, message, details', () => {
    const err = new ApiError({
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_FAILED,
      message: 'Bad payload',
      details: { email: ['invalid format'] },
    });

    expect(err.statusCode).toBe(400);
    expect(err.code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(err.message).toBe('Bad payload');
    expect(err.details).toEqual({ email: ['invalid format'] });
    expect(err.name).toBe('ApiError');
  });

  it('classifier — isAuthError returns true for 401', () => {
    const err = new ApiError({
      statusCode: 401,
      code: ERROR_CODES.UNAUTHORIZED,
      message: 'Token expired',
    });
    expect(err.isAuthError).toBe(true);
  });

  it('classifier — isAuthError returns true for TOKEN_EXPIRED code regardless of status', () => {
    const err = new ApiError({
      statusCode: 500,
      code: ERROR_CODES.TOKEN_EXPIRED,
      message: 'oops',
    });
    expect(err.isAuthError).toBe(true);
  });

  it('classifier — isValidationError returns true for 400', () => {
    const err = new ApiError({
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_FAILED,
      message: 'invalid',
    });
    expect(err.isValidationError).toBe(true);
  });

  it('classifier — isServerError returns true for any 5xx', () => {
    for (const status of [500, 502, 503, 504]) {
      const err = new ApiError({
        statusCode: status,
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'server fail',
      });
      expect(err.isServerError).toBe(true);
    }
  });

  it('classifier — isRateLimited returns true for 429', () => {
    const err = new ApiError({
      statusCode: 429,
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'slow down',
    });
    expect(err.isRateLimited).toBe(true);
  });

  it('classifier — isNotFound returns true for 404', () => {
    const err = new ApiError({
      statusCode: 404,
      code: ERROR_CODES.NOT_FOUND,
      message: 'gone',
    });
    expect(err.isNotFound).toBe(true);
  });

  it('preserves error cause for upstream wrapping', () => {
    const root = new Error('underlying');
    const err = new ApiError({
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'server',
      cause: root,
    });
    expect(err.cause).toBe(root);
  });
});

describe('NetworkError', () => {
  it('default message + isNetworkError discriminator', () => {
    const err = new NetworkError();
    expect(err.name).toBe('NetworkError');
    expect(err.message).toBe('Network request failed');
    expect(err.isNetworkError).toBe(true);
  });

  it('accepts custom message + cause', () => {
    const root = new TypeError('failed to fetch');
    const err = new NetworkError('Offline', { cause: root });
    expect(err.message).toBe('Offline');
    expect(err.cause).toBe(root);
  });
});

describe('isApiError type guard', () => {
  it('returns true for ApiError instances', () => {
    const err = new ApiError({
      statusCode: 400,
      code: ERROR_CODES.VALIDATION_FAILED,
      message: 'invalid',
    });
    expect(isApiError(err)).toBe(true);
  });

  it('returns true for structurally-equivalent objects (HMR-safe)', () => {
    // Simulate an ApiError from a duplicated module — different
    // constructor, identical surface.
    const hmrSimulated = {
      name: 'ApiError',
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'oops',
    };
    expect(isApiError(hmrSimulated)).toBe(true);
  });

  it('returns false for plain Error', () => {
    expect(isApiError(new Error('plain'))).toBe(false);
  });

  it('returns false for null/undefined/primitives', () => {
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError('string')).toBe(false);
    expect(isApiError(42)).toBe(false);
  });

  it('returns false for NetworkError', () => {
    expect(isApiError(new NetworkError())).toBe(false);
  });
});

describe('isNetworkError type guard', () => {
  it('returns true for NetworkError instances', () => {
    expect(isNetworkError(new NetworkError())).toBe(true);
  });

  it('returns true for structurally-equivalent objects (HMR-safe)', () => {
    const hmrSimulated = { isNetworkError: true };
    expect(isNetworkError(hmrSimulated)).toBe(true);
  });

  it('returns false for ApiError', () => {
    const err = new ApiError({
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: 'x',
    });
    expect(isNetworkError(err)).toBe(false);
  });

  it('returns false for null/undefined/primitives', () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
    expect(isNetworkError({})).toBe(false);
  });
});
