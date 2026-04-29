// ═══════════════════════════════════════════════════════════════
// EMAIL SCHEMA TESTS (Shared Package)
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  emailTemplateNameSchema,
  emailSendRequestSchema,
  emailLogQuerySchema,
} from '../../../validators/domains/email.schema';

describe('emailTemplateNameSchema', () => {
  it('accepts otp', () => {
    expect(emailTemplateNameSchema.safeParse('otp').success).toBe(true);
  });

  it('accepts welcome', () => {
    expect(emailTemplateNameSchema.safeParse('welcome').success).toBe(true);
  });

  it('accepts consultation_complete', () => {
    expect(emailTemplateNameSchema.safeParse('consultation_complete').success).toBe(true);
  });

  it('rejects unknown template', () => {
    expect(emailTemplateNameSchema.safeParse('unknown_template').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(emailTemplateNameSchema.safeParse('').success).toBe(false);
  });

  it('rejects number', () => {
    expect(emailTemplateNameSchema.safeParse(123).success).toBe(false);
  });
});

describe('emailSendRequestSchema', () => {
  it('accepts minimal valid request', () => {
    const result = emailSendRequestSchema.safeParse({
      to: 'test@datunai.com',
      template: 'otp',
    });
    expect(result.success).toBe(true);
  });

  it('applies default locale and vars', () => {
    const result = emailSendRequestSchema.parse({
      to: 'test@test.com',
      template: 'welcome',
    });
    expect(result.locale).toBe('en');
    expect(result.vars).toEqual({});
  });

  it('auto-lowercases email', () => {
    const result = emailSendRequestSchema.parse({
      to: 'TEST@GMAIL.COM',
      template: 'otp',
    });
    expect(result.to).toBe('test@gmail.com');
  });

  it('rejects disposable email', () => {
    expect(
      emailSendRequestSchema.safeParse({
        to: 'spam@mailinator.com',
        template: 'welcome',
      }).success,
    ).toBe(false);
  });

  it('rejects invalid template', () => {
    expect(
      emailSendRequestSchema.safeParse({
        to: 'test@test.com',
        template: 'invalid',
      }).success,
    ).toBe(false);
  });

  it('accepts optional userId', () => {
    const result = emailSendRequestSchema.safeParse({
      to: 'test@test.com',
      template: 'otp',
      userId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid userId format', () => {
    expect(
      emailSendRequestSchema.safeParse({
        to: 'test@test.com',
        template: 'otp',
        userId: 'not-a-uuid',
      }).success,
    ).toBe(false);
  });
});

describe('emailLogQuerySchema', () => {
  it('accepts empty query', () => {
    expect(emailLogQuerySchema.safeParse({}).success).toBe(true);
  });

  it('accepts SENT status', () => {
    expect(emailLogQuerySchema.safeParse({ status: 'SENT' }).success).toBe(true);
  });

  it('accepts BOUNCED status', () => {
    expect(emailLogQuerySchema.safeParse({ status: 'BOUNCED' }).success).toBe(true);
  });

  it('accepts FAILED status', () => {
    expect(emailLogQuerySchema.safeParse({ status: 'FAILED' }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(emailLogQuerySchema.safeParse({ status: 'PENDING' }).success).toBe(false);
  });
});
