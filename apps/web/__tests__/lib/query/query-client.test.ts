// apps/web/__tests__/lib/query/query-client.test.ts
// ═══════════════════════════════════════════════════════════════
// QueryClient factory — Unit Tests
// Task #47 Phase 3
//
// Validates the FAANG defaults we ship with every QueryClient:
//   - staleTime 60s, gcTime 5min
//   - retry policy: 4xx no-retry except 408/429; 5xx retry up to 3
//   - exponential backoff capped at 30s
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { makeQueryClient } from '@/lib/query/query-client';
import { ApiError } from '@/lib/api';
import { ERROR_CODES } from '@repo/shared';

describe('makeQueryClient — defaults', () => {
  it('uses 60s staleTime', () => {
    const client = makeQueryClient();
    const defaults = client.getDefaultOptions().queries;
    expect(defaults?.staleTime).toBe(60_000);
  });

  it('uses 5min gcTime', () => {
    const client = makeQueryClient();
    const defaults = client.getDefaultOptions().queries;
    expect(defaults?.gcTime).toBe(5 * 60_000);
  });

  it('enables refetchOnWindowFocus + refetchOnReconnect', () => {
    const client = makeQueryClient();
    const defaults = client.getDefaultOptions().queries;
    expect(defaults?.refetchOnWindowFocus).toBe(true);
    expect(defaults?.refetchOnReconnect).toBe(true);
  });

  it('disables retry on mutations (opt-in only)', () => {
    const client = makeQueryClient();
    const defaults = client.getDefaultOptions().mutations;
    expect(defaults?.retry).toBe(false);
  });
});

describe('makeQueryClient — retry policy', () => {
  function getRetryFn(): (failureCount: number, error: unknown) => boolean {
    const client = makeQueryClient();
    const retry = client.getDefaultOptions().queries?.retry;
    if (typeof retry !== 'function') {
      throw new Error('retry must be a function');
    }
    return retry as (failureCount: number, error: unknown) => boolean;
  }

  function makeApiError(statusCode: number, code: string = 'INTERNAL_ERROR') {
    return new ApiError({ statusCode, code, message: 'test' });
  }

  it('does NOT retry on 401 (auth error — refresh layer owns it)', () => {
    const retry = getRetryFn();
    const err = makeApiError(401, ERROR_CODES.UNAUTHORIZED);
    expect(retry(0, err)).toBe(false);
  });

  it('does NOT retry on TOKEN_EXPIRED code regardless of status', () => {
    const retry = getRetryFn();
    const err = makeApiError(500, ERROR_CODES.TOKEN_EXPIRED);
    expect(retry(0, err)).toBe(false);
  });

  it('does NOT retry on 400 validation', () => {
    const retry = getRetryFn();
    expect(retry(0, makeApiError(400))).toBe(false);
  });

  it('does NOT retry on 403 forbidden', () => {
    const retry = getRetryFn();
    expect(retry(0, makeApiError(403))).toBe(false);
  });

  it('does NOT retry on 404 not-found', () => {
    const retry = getRetryFn();
    expect(retry(0, makeApiError(404))).toBe(false);
  });

  it('retries on 408 timeout', () => {
    const retry = getRetryFn();
    expect(retry(0, makeApiError(408))).toBe(true);
  });

  it('retries on 429 rate-limit', () => {
    const retry = getRetryFn();
    expect(retry(0, makeApiError(429))).toBe(true);
  });

  it('retries on 500/502/503/504', () => {
    const retry = getRetryFn();
    for (const status of [500, 502, 503, 504]) {
      expect(retry(0, makeApiError(status))).toBe(true);
    }
  });

  it('retries plain Error (network failure surrogate)', () => {
    const retry = getRetryFn();
    expect(retry(0, new Error('network down'))).toBe(true);
  });

  it('stops retrying after 3 attempts (MAX_RETRIES)', () => {
    const retry = getRetryFn();
    expect(retry(3, makeApiError(500))).toBe(false);
  });

  it('allows attempts 0, 1, 2 for retryable errors', () => {
    const retry = getRetryFn();
    expect(retry(0, makeApiError(500))).toBe(true);
    expect(retry(1, makeApiError(500))).toBe(true);
    expect(retry(2, makeApiError(500))).toBe(true);
  });
});

describe('makeQueryClient — retryDelay (exponential backoff)', () => {
  it('caps at 30 seconds', () => {
    const client = makeQueryClient();
    const retryDelay = client.getDefaultOptions().queries?.retryDelay;
    if (typeof retryDelay !== 'function') {
      throw new Error('retryDelay must be a function');
    }
    // attempt 10 → 2^10 * 1000 = 1024000ms → capped at 30000
    expect((retryDelay as (i: number, e: unknown) => number)(10, new Error())).toBe(30_000);
  });

  it('grows exponentially below the cap', () => {
    const client = makeQueryClient();
    const retryDelay = client.getDefaultOptions().queries?.retryDelay;
    if (typeof retryDelay !== 'function') {
      throw new Error('retryDelay must be a function');
    }
    const delay = retryDelay as (i: number, e: unknown) => number;
    expect(delay(0, new Error())).toBe(1_000);
    expect(delay(1, new Error())).toBe(2_000);
    expect(delay(2, new Error())).toBe(4_000);
    expect(delay(3, new Error())).toBe(8_000);
  });
});
