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
