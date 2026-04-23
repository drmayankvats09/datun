import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
} from '../../errors/index.js';

describe('Error Hierarchy', () => {
  it('AppError sets correct properties', () => {
    const err = new AppError('test', 400, 'TEST_ERROR');
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('TEST_ERROR');
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('ValidationError → 400 with details', () => {
    const details = { email: ['Invalid email'] };
    const err = new ValidationError('Validation failed', details);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual(details);
    expect(err).toBeInstanceOf(AppError);
  });

  it('AuthenticationError → 401', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_ERROR');
  });

  it('ForbiddenError → 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('NotFoundError → 404 with resource name', () => {
    const err = new NotFoundError('User', 'abc-123');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("User 'abc-123' not found");
    expect(err.code).toBe('NOT_FOUND');
  });

  it('ConflictError → 409', () => {
    const err = new ConflictError('Email already registered');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('RateLimitError → 429', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('ExternalServiceError → 503 with service name', () => {
    const err = new ExternalServiceError('Claude API');
    expect(err.statusCode).toBe(503);
    expect(err.service).toBe('Claude API');
    expect(err.code).toBe('EXTERNAL_SERVICE_ERROR');
  });

  it('all errors are instanceof Error (catch-all compatible)', () => {
    const errors = [
      new ValidationError(),
      new AuthenticationError(),
      new ForbiddenError(),
      new NotFoundError('X'),
      new ConflictError(),
      new RateLimitError(),
      new ExternalServiceError('Y'),
    ];
    errors.forEach((err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
    });
  });
});
