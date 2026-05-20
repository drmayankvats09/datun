// apps/api/src/__tests__/middleware/kill-switch.test.ts
// ═══════════════════════════════════════════════════════════════
// KILL-SWITCH MIDDLEWARE — Behaviour contract (Task #49)
// ─────────────────────────────────────────────────────────────────
// Validates:
//   1. flag ON  → middleware calls next(err) with 503 AppError.
//   2. flag OFF → middleware calls next() (no error).
//   3. req.featureFlags undefined → falls back to defaults (no
//      false 503 — defensive against middleware order mistakes).
//   4. Retry-After header set per RFC 7231.
//   5. requireFlagOn returns 404 (NOT_FOUND) when feature missing
//      — no information leak.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { FLAG_KEYS } from '@repo/shared';
import { requireFlagOff, requireFlagOn } from '../../middleware/kill-switch.middleware.js';
import { AppError } from '../../errors/index.js';

function mkReq(featureFlags?: Record<string, boolean>): Request {
  return {
    featureFlags,
    requestId: 'test-req',
    method: 'GET',
    originalUrl: '/api/charge',
  } as unknown as Request;
}

function mkRes() {
  const headers: Record<string, string> = {};
  return {
    setHeader: vi.fn((k: string, v: string) => {
      headers[k] = v;
    }),
    headers,
  } as unknown as Response & { headers: Record<string, string> };
}

describe('requireFlagOff', () => {
  it('calls next() when flag is OFF', () => {
    const req = mkReq({ [FLAG_KEYS.KILLSWITCH_PAYMENTS]: false });
    const res = mkRes();
    const next = vi.fn();
    requireFlagOff(FLAG_KEYS.KILLSWITCH_PAYMENTS)(req, res, next as NextFunction);
    expect(next).toHaveBeenCalledWith();
    // Headers untouched on pass-through.
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('calls next(AppError) with 503 when flag is ON', () => {
    const req = mkReq({ [FLAG_KEYS.KILLSWITCH_PAYMENTS]: true });
    const res = mkRes();
    const next = vi.fn();
    requireFlagOff(FLAG_KEYS.KILLSWITCH_PAYMENTS)(req, res, next as NextFunction);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(503);
    expect((err as AppError).code).toBe('KILL_SWITCH_ACTIVE');
  });

  it('sets Retry-After header to the configured value', () => {
    const req = mkReq({ [FLAG_KEYS.KILLSWITCH_PAYMENTS]: true });
    const res = mkRes();
    const next = vi.fn();
    requireFlagOff(FLAG_KEYS.KILLSWITCH_PAYMENTS, { retryAfterSeconds: 120 })(
      req,
      res,
      next as NextFunction,
    );
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '120');
  });

  it('falls back to defaults when req.featureFlags is undefined', () => {
    // KILLSWITCH_PAYMENTS default is false (kill INACTIVE) — so
    // an undefined map should NOT trigger a false 503.
    const req = mkReq(undefined);
    const res = mkRes();
    const next = vi.fn();
    requireFlagOff(FLAG_KEYS.KILLSWITCH_PAYMENTS)(req, res, next as NextFunction);
    expect(next).toHaveBeenCalledWith();
  });

  it('uses the supplied message in the AppError', () => {
    const req = mkReq({ [FLAG_KEYS.KILLSWITCH_PAYMENTS]: true });
    const res = mkRes();
    const next = vi.fn();
    requireFlagOff(FLAG_KEYS.KILLSWITCH_PAYMENTS, {
      message: 'Payments paused — see status page.',
    })(req, res, next as NextFunction);
    const err = next.mock.calls[0]?.[0] as AppError;
    expect(err.message).toBe('Payments paused — see status page.');
  });
});

describe('requireFlagOn', () => {
  it('calls next() when flag is ON', () => {
    const req = mkReq({ [FLAG_KEYS.CONSULTATION_STREAMING]: true });
    const res = mkRes();
    const next = vi.fn();
    requireFlagOn(FLAG_KEYS.CONSULTATION_STREAMING)(req, res, next as NextFunction);
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 404 (NOT_FOUND) when flag is OFF — no information leak', () => {
    const req = mkReq({ [FLAG_KEYS.CONSULTATION_STREAMING]: false });
    const res = mkRes();
    const next = vi.fn();
    requireFlagOn(FLAG_KEYS.CONSULTATION_STREAMING)(req, res, next as NextFunction);
    const err = next.mock.calls[0]?.[0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('returns 404 when featureFlags is undefined and default is false', () => {
    // CONSULTATION_STREAMING default is false.
    const req = mkReq(undefined);
    const res = mkRes();
    const next = vi.fn();
    requireFlagOn(FLAG_KEYS.CONSULTATION_STREAMING)(req, res, next as NextFunction);
    const err = next.mock.calls[0]?.[0] as AppError;
    expect(err.statusCode).toBe(404);
  });
});
