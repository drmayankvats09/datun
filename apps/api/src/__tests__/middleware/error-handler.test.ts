// ═══════════════════════════════════════════════════════════════
// ERROR HANDLER MIDDLEWARE TESTS
// Covers: AppError mapping, Prisma error mapping, unknown errors
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { setupErrorHandlers } from '../../middleware/error-handler.js';
import { AppError, ValidationError, NotFoundError } from '../../errors/index.js';

function buildApp(handler: () => never) {
  const app = express();
  app.use(express.json());
  app.get('/test', () => handler());
  setupErrorHandlers(app);
  return app;
}

describe('Error Handler Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps AppError to its statusCode + JSON envelope', async () => {
    const app = buildApp(() => {
      throw new NotFoundError('User');
    });

    const res = await request(app).get('/test');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBeTruthy();
    expect(res.body.error.message).toBe('User not found');
  });

  it('includes details for ValidationError', async () => {
    const app = buildApp(() => {
      throw new ValidationError('Invalid input', { email: ['Required'] });
    });

    const res = await request(app).get('/test');
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual({ email: ['Required'] });
  });

  it('maps Prisma P2002 (unique constraint) to 409 CONFLICT', async () => {
    const app = buildApp(() => {
      const err = new Error('Unique constraint failed') as Error & {
        code?: string;
        meta?: { target?: string[] };
      };
      err.code = 'P2002';
      err.meta = { target: ['email'] };
      throw err;
    });

    const res = await request(app).get('/test');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toContain('email');
  });

  it('maps Prisma P2025 (record not found) to 404', async () => {
    const app = buildApp(() => {
      const err = new Error('Record not found') as Error & { code?: string };
      err.code = 'P2025';
      throw err;
    });

    const res = await request(app).get('/test');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('maps Prisma P2003 (foreign key) to 400 INVALID_REFERENCE', async () => {
    const app = buildApp(() => {
      const err = new Error('Foreign key violation') as Error & { code?: string };
      err.code = 'P2003';
      throw err;
    });

    const res = await request(app).get('/test');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REFERENCE');
  });

  it('maps unknown errors to 500 with generic message (no stack leak)', async () => {
    const app = buildApp(() => {
      throw new Error('Internal database connection lost — secrets in stack');
    });

    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('Something went wrong. Please try again.');
    expect(res.body.error.message).not.toContain('database');
    expect(res.body.error.message).not.toContain('secrets');
  });

  it('AppError without operational flag treated as unknown error', async () => {
    const app = buildApp(() => {
      const err = new AppError('Programmer error', 500, 'INTERNAL_ERROR', false);
      throw err;
    });

    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
