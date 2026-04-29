// ═══════════════════════════════════════════════════════════════
// PAGINATION PRIMITIVE TESTS — Defaults, limits, coercion
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  offsetPaginationSchema,
  cursorPaginationSchema,
  sortOrderField,
  PAGINATION_LIMITS,
} from '../../../validators/primitives/pagination.js';

describe('offsetPaginationSchema', () => {
  it('applies defaults when empty object', () => {
    const result = offsetPaginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('accepts valid page and limit', () => {
    const result = offsetPaginationSchema.parse({ page: 3, limit: 50 });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it('coerces string numbers (query params)', () => {
    const result = offsetPaginationSchema.parse({ page: '2', limit: '10' });
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
  });

  it('rejects page 0', () => {
    expect(offsetPaginationSchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it('rejects negative page', () => {
    expect(offsetPaginationSchema.safeParse({ page: -1 }).success).toBe(false);
  });

  it('rejects limit exceeding 100', () => {
    expect(offsetPaginationSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('accepts limit at exactly 100', () => {
    expect(offsetPaginationSchema.safeParse({ limit: 100 }).success).toBe(true);
  });

  it('rejects limit 0', () => {
    expect(offsetPaginationSchema.safeParse({ limit: 0 }).success).toBe(false);
  });
});

describe('cursorPaginationSchema', () => {
  it('applies default limit when no cursor', () => {
    const result = cursorPaginationSchema.parse({});
    expect(result.cursor).toBeUndefined();
    expect(result.limit).toBe(20);
  });

  it('accepts cursor string', () => {
    const result = cursorPaginationSchema.parse({ cursor: 'abc123', limit: 10 });
    expect(result.cursor).toBe('abc123');
    expect(result.limit).toBe(10);
  });
});

describe('sortOrderField', () => {
  it('defaults to desc', () => {
    expect(sortOrderField.parse(undefined)).toBe('desc');
  });

  it('accepts asc', () => {
    expect(sortOrderField.parse('asc')).toBe('asc');
  });

  it('accepts desc', () => {
    expect(sortOrderField.parse('desc')).toBe('desc');
  });

  it('rejects invalid sort order', () => {
    expect(sortOrderField.safeParse('random').success).toBe(false);
  });
});

describe('PAGINATION_LIMITS', () => {
  it('default page is 1', () => {
    expect(PAGINATION_LIMITS.defaultPage).toBe(1);
  });

  it('default limit is 20', () => {
    expect(PAGINATION_LIMITS.defaultLimit).toBe(20);
  });

  it('max limit is 100', () => {
    expect(PAGINATION_LIMITS.maxLimit).toBe(100);
  });
});
