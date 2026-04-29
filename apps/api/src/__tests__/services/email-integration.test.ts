// ═══════════════════════════════════════════════════════════════
// EMAIL INTEGRATION TESTS — Types, config, smoke checks
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import type {
  EmailSendResult,
  EmailClientConfig,
  EmailProviderHealth,
  EmailClientSendOptions,
  EmailTemplateName,
} from '../../services/email/types.js';

describe('Email Type Contracts', () => {
  it('EmailSendResult has required fields', () => {
    const result: EmailSendResult = {
      success: true,
      provider: 'resend',
      providerMessageId: 'msg-123',
    };
    expect(result.success).toBe(true);
    expect(result.provider).toBe('resend');
  });

  it('EmailSendResult failure has error fields', () => {
    const result: EmailSendResult = {
      success: false,
      provider: 'ses',
      errorMessage: 'Rate limited',
      errorCode: 'RATE_LIMIT',
    };
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBeTruthy();
  });

  it('EmailClientConfig has circuit breaker defaults', () => {
    const config: EmailClientConfig = {
      circuitBreakerThreshold: 3,
      circuitBreakerWindowMs: 60_000,
      circuitBreakerCooldownMs: 300_000,
    };
    expect(config.circuitBreakerThreshold).toBe(3);
    expect(config.circuitBreakerCooldownMs).toBe(300_000);
  });

  it('EmailProviderHealth tracks state', () => {
    const health: EmailProviderHealth = {
      status: 'healthy',
      consecutiveFailures: 0,
      lastSuccessAt: Date.now(),
      lastFailureAt: null,
      unhealthyUntil: null,
      totalSent: 42,
      totalFailed: 1,
    };
    expect(health.status).toBe('healthy');
    expect(health.totalSent).toBe(42);
  });

  it('EmailClientSendOptions accepts all fields', () => {
    const opts: EmailClientSendOptions = {
      to: 'test@test.com',
      template: 'otp',
      vars: { code: '123456' },
      locale: 'hi',
      userId: '550e8400-e29b-41d4-a716-446655440000',
      consultationId: '550e8400-e29b-41d4-a716-446655440001',
    };
    expect(opts.template).toBe('otp');
    expect(opts.locale).toBe('hi');
  });

  it('all 12 template names are valid', () => {
    const templates: EmailTemplateName[] = [
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
    expect(templates).toHaveLength(12);
  });
});

describe('Email Shared Helpers', () => {
  it('emailWrapper from @repo/shared is a function', async () => {
    const { emailWrapper } = await import('@repo/shared');
    expect(typeof emailWrapper).toBe('function');
  });

  it('emailFooter from @repo/shared is a function', async () => {
    const { emailFooter } = await import('@repo/shared');
    expect(typeof emailFooter).toBe('function');
  });

  it('emailWrapper returns HTML string', async () => {
    const { emailWrapper } = await import('@repo/shared');
    const html = emailWrapper('<p>Test</p>');
    expect(html).toContain('<p>Test</p>');
    expect(html).toContain('font-family');
  });

  it('emailFooter includes unsubscribe link', async () => {
    const { emailFooter } = await import('@repo/shared');
    const html = emailFooter();
    expect(html).toContain('unsubscribe');
  });
});
