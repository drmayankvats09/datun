import { describe, it, expect } from 'vitest';
import { paginationMetaSchema } from '../../../validators/responses/envelope.schema.js';
import { ERROR_CODES } from '../../../validators/responses/error-codes.js';

describe('paginationMetaSchema', () => {
  it('accepts valid pagination', () => {
    expect(
      paginationMetaSchema.safeParse({
        page: 1,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasMore: true,
      }).success,
    ).toBe(true);
  });

  it('rejects page 0', () => {
    expect(
      paginationMetaSchema.safeParse({
        page: 0,
        limit: 20,
        total: 100,
        totalPages: 5,
        hasMore: true,
      }).success,
    ).toBe(false);
  });

  it('rejects negative total', () => {
    expect(
      paginationMetaSchema.safeParse({
        page: 1,
        limit: 20,
        total: -1,
        totalPages: 0,
        hasMore: false,
      }).success,
    ).toBe(false);
  });

  it('accepts zero total (empty result set)', () => {
    expect(
      paginationMetaSchema.safeParse({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      }).success,
    ).toBe(true);
  });
});

describe('ERROR_CODES', () => {
  it('has UNAUTHORIZED', () => {
    expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
  });

  it('has VALIDATION_FAILED', () => {
    expect(ERROR_CODES.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
  });

  it('has RATE_LIMIT_EXCEEDED', () => {
    expect(ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('has AI_SERVICE_UNAVAILABLE', () => {
    expect(ERROR_CODES.AI_SERVICE_UNAVAILABLE).toBe('AI_SERVICE_UNAVAILABLE');
  });

  it('has at least 15 error codes', () => {
    expect(Object.keys(ERROR_CODES).length).toBeGreaterThanOrEqual(15);
  });

  it('all codes are uppercase strings', () => {
    for (const code of Object.values(ERROR_CODES)) {
      expect(code).toMatch(/^[A-Z_]+$/);
    }
  });
});
