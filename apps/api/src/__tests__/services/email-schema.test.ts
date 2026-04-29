// ═══════════════════════════════════════════════════════════════
// EMAIL SCHEMA TESTS — Validation for email operations
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { emailTemplateNameSchema, emailSendRequestSchema, emailLogQuerySchema } from '@repo/shared';

describe('emailTemplateNameSchema', () => {
  it('accepts valid template name', () => {
    expect(emailTemplateNameSchema.safeParse('otp').success).toBe(true);
  });

  it('accepts all 12 templates', () => {
    const templates = [
      'otp',
      'welcome',
      'consultation_complete',
      'follow_up_3day',
      'follow_up_7day',
      'password_reset',
      'security_alert',
      'clinic_welcome',
      'clinic_lead',
      'payment_receipt',
      'admin_alert',
      'daily_report',
    ];
    for (const t of templates) {
      expect(emailTemplateNameSchema.safeParse(t).success).toBe(true);
    }
  });

  it('rejects unknown template', () => {
    expect(emailTemplateNameSchema.safeParse('unknown').success).toBe(false);
  });
});

describe('emailSendRequestSchema', () => {
  it('accepts valid send request', () => {
    expect(
      emailSendRequestSchema.safeParse({
        to: 'test@datunai.com',
        template: 'otp',
        vars: { code: '123456' },
      }).success,
    ).toBe(true);
  });

  it('auto-lowercases email', () => {
    const result = emailSendRequestSchema.parse({
      to: 'TEST@GMAIL.COM',
      template: 'welcome',
    });
    expect(result.to).toBe('test@gmail.com');
  });

  it('defaults locale to en', () => {
    const result = emailSendRequestSchema.parse({
      to: 'test@test.com',
      template: 'otp',
    });
    expect(result.locale).toBe('en');
  });

  it('rejects invalid email', () => {
    expect(
      emailSendRequestSchema.safeParse({
        to: 'not-email',
        template: 'otp',
      }).success,
    ).toBe(false);
  });

  it('rejects invalid template', () => {
    expect(
      emailSendRequestSchema.safeParse({
        to: 'test@test.com',
        template: 'fake',
      }).success,
    ).toBe(false);
  });

  it('rejects disposable email', () => {
    expect(
      emailSendRequestSchema.safeParse({
        to: 'test@mailinator.com',
        template: 'welcome',
      }).success,
    ).toBe(false);
  });
});

describe('emailLogQuerySchema', () => {
  it('accepts empty query (all logs)', () => {
    expect(emailLogQuerySchema.safeParse({}).success).toBe(true);
  });

  it('accepts filter by template', () => {
    expect(emailLogQuerySchema.safeParse({ template: 'otp' }).success).toBe(true);
  });

  it('accepts filter by status', () => {
    expect(emailLogQuerySchema.safeParse({ status: 'SENT' }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(emailLogQuerySchema.safeParse({ status: 'PENDING' }).success).toBe(false);
  });
});
