import { describe, it, expect, vi } from 'vitest';
import { validate } from '../../middleware/validate.js';
import { ValidationError } from '../../errors/index.js';
import { loginEmailSchema } from '../../validators/schemas.js';
import type { Request, Response, NextFunction } from 'express';

function mockReqResNext(body: unknown) {
  const req = { body } as Request;
  const res = {} as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('validate middleware', () => {
  const middleware = validate(loginEmailSchema);

  it('calls next() on valid body', () => {
    const { req, res, next } = mockReqResNext({
      email: 'test@test.com',
      password: 'pass123',
    });
    middleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('replaces req.body with parsed data (strips unknown fields)', () => {
    const { req, res, next } = mockReqResNext({
      email: 'test@test.com',
      password: 'pass123',
      extraField: 'should be stripped',
    });
    middleware(req, res, next);
    expect(req.body).not.toHaveProperty('extraField');
    expect(req.body.email).toBe('test@test.com');
  });

  it('throws ValidationError on invalid body', () => {
    const { req, res, next } = mockReqResNext({ email: 'bad' });
    expect(() => middleware(req, res, next)).toThrow(ValidationError);
  });

  it('includes field-level error details', () => {
    const { req, res, next } = mockReqResNext({});
    try {
      middleware(req, res, next);
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      const valErr = err as ValidationError;
      expect(valErr.details).toBeDefined();
      expect(Object.keys(valErr.details).length).toBeGreaterThan(0);
    }
  });
});

describe('validateQuery middleware', () => {
  it('imports validateQuery successfully', async () => {
    const mod = await import('../../middleware/validate.js');
    expect(typeof mod.validateQuery).toBe('function');
  });

  it('calls next() on valid query', async () => {
    const { validateQuery } = await import('../../middleware/validate.js');
    const { z } = await import('zod');
    const schema = z.object({ page: z.coerce.number().int().min(1) });
    const middleware = validateQuery(schema);

    const req = { query: { page: '5' } } as unknown as Request;
    const next = vi.fn() as NextFunction;
    middleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
    expect((req.query as unknown as { page: number }).page).toBe(5);
  });

  it('throws ValidationError on invalid query', async () => {
    const { validateQuery } = await import('../../middleware/validate.js');
    const { z } = await import('zod');
    const schema = z.object({ page: z.coerce.number().int().min(1) });
    const middleware = validateQuery(schema);

    const req = { query: { page: '0' } } as unknown as Request;
    expect(() => middleware(req, {} as Response, vi.fn() as NextFunction)).toThrow(ValidationError);
  });
});

describe('validateParams middleware', () => {
  it('imports validateParams successfully', async () => {
    const mod = await import('../../middleware/validate.js');
    expect(typeof mod.validateParams).toBe('function');
  });

  it('calls next() on valid params', async () => {
    const { validateParams } = await import('../../middleware/validate.js');
    const { z } = await import('zod');
    const schema = z.object({ id: z.string().uuid() });
    const middleware = validateParams(schema);

    const req = { params: { id: '550e8400-e29b-41d4-a716-446655440000' } } as unknown as Request;
    const next = vi.fn() as NextFunction;
    middleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('throws ValidationError on invalid params', async () => {
    const { validateParams } = await import('../../middleware/validate.js');
    const { z } = await import('zod');
    const schema = z.object({ id: z.string().uuid() });
    const middleware = validateParams(schema);

    const req = { params: { id: 'not-a-uuid' } } as unknown as Request;
    expect(() => middleware(req, {} as Response, vi.fn() as NextFunction)).toThrow(ValidationError);
  });
});
