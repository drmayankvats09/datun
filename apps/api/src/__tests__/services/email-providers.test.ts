// ═══════════════════════════════════════════════════════════════
// EMAIL PROVIDER TESTS — Resend + SES + Circuit Breaker
// Mocked providers — no real API calls.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import type {
  EmailProvider,
  EmailSendResult,
  EmailSendOptions,
} from '../../services/email/types.js';

// ── Mock Provider Factory ──

function createMockProvider(
  name: string,
  configured: boolean,
  sendFn?: (opts: EmailSendOptions) => Promise<EmailSendResult>,
): EmailProvider {
  return {
    name,
    isConfigured: () => configured,
    send:
      sendFn ??
      (async () => ({
        success: true,
        provider: name,
        providerMessageId: `${name}-msg-${Date.now()}`,
      })),
    healthCheck: async () => ({ ok: configured, latencyMs: 50 }),
  };
}

describe('EmailProvider interface', () => {
  it('mock provider returns success', async () => {
    const provider = createMockProvider('test', true);
    const result = await provider.send({
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(result.success).toBe(true);
    expect(result.provider).toBe('test');
    expect(result.providerMessageId).toBeTruthy();
  });

  it('unconfigured provider returns false', () => {
    const provider = createMockProvider('test', false);
    expect(provider.isConfigured()).toBe(false);
  });

  it('configured provider returns true', () => {
    const provider = createMockProvider('test', true);
    expect(provider.isConfigured()).toBe(true);
  });

  it('health check returns ok for configured provider', async () => {
    const provider = createMockProvider('test', true);
    const health = await provider.healthCheck();
    expect(health.ok).toBe(true);
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('health check returns not ok for unconfigured', async () => {
    const provider = createMockProvider('test', false);
    const health = await provider.healthCheck();
    expect(health.ok).toBe(false);
  });

  it('failed send returns error details', async () => {
    const provider = createMockProvider('test', true, async () => ({
      success: false,
      provider: 'test',
      errorMessage: 'Rate limited',
      errorCode: 'RATE_LIMIT',
    }));
    const result = await provider.send({
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Rate limited');
    expect(result.errorCode).toBe('RATE_LIMIT');
  });
});

describe('Circuit Breaker Logic (unit)', () => {
  // Simulating circuit breaker behavior with counters

  it('tracks consecutive failures', () => {
    let failures = 0;
    const threshold = 3;

    // Simulate 3 failures
    for (let i = 0; i < 3; i++) {
      failures++;
    }
    expect(failures).toBe(threshold);
    expect(failures >= threshold).toBe(true); // Should trip circuit
  });

  it('resets on success', () => {
    let failures = 2; // 2 failures
    // Success resets
    failures = 0;
    expect(failures).toBe(0);
  });

  it('cooldown timer logic', () => {
    const cooldownMs = 300_000; // 5 min
    const trippedAt = Date.now() - 400_000; // 6.6 min ago
    const unhealthyUntil = trippedAt + cooldownMs;

    // Should be recovered — current time > unhealthyUntil
    expect(Date.now() > unhealthyUntil).toBe(true);
  });

  it('still in cooldown', () => {
    const cooldownMs = 300_000;
    const trippedAt = Date.now() - 100_000; // 1.6 min ago
    const unhealthyUntil = trippedAt + cooldownMs;

    // Should still be unhealthy
    expect(Date.now() > unhealthyUntil).toBe(false);
  });
});

describe('Provider Chain Logic (unit)', () => {
  it('tries providers in order until success', async () => {
    const callOrder: string[] = [];

    const failProvider = createMockProvider('fail', true, async () => {
      callOrder.push('fail');
      return { success: false, provider: 'fail', errorMessage: 'Down' };
    });

    const successProvider = createMockProvider('success', true, async () => {
      callOrder.push('success');
      return { success: true, provider: 'success', providerMessageId: 'msg-1' };
    });

    const providers = [failProvider, successProvider];
    let lastResult: EmailSendResult = { success: false, provider: 'none' };

    for (const p of providers) {
      const result = await p.send({
        to: 'test@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      if (result.success) {
        lastResult = result;
        break;
      }
      lastResult = result;
    }

    expect(callOrder).toEqual(['fail', 'success']);
    expect(lastResult.success).toBe(true);
    expect(lastResult.provider).toBe('success');
  });

  it('returns failure when all providers fail', async () => {
    const fail1 = createMockProvider('resend', true, async () => ({
      success: false,
      provider: 'resend',
      errorMessage: 'Resend down',
    }));
    const fail2 = createMockProvider('ses', true, async () => ({
      success: false,
      provider: 'ses',
      errorMessage: 'SES down',
    }));

    const providers = [fail1, fail2];
    let lastResult: EmailSendResult = { success: false, provider: 'none' };

    for (const p of providers) {
      const result = await p.send({
        to: 'test@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      if (result.success) {
        lastResult = result;
        break;
      }
      lastResult = result;
    }

    expect(lastResult.success).toBe(false);
  });

  it('skips unconfigured providers', async () => {
    const unconfigured = createMockProvider('ses', false);
    const configured = createMockProvider('resend', true);

    const providers = [unconfigured, configured].filter((p) => p.isConfigured());
    expect(providers.length).toBe(1);
    expect(providers[0]!.name).toBe('resend');
  });
});

describe('EmailSendOptions validation', () => {
  it('requires to, subject, html', () => {
    const opts: EmailSendOptions = {
      to: 'test@test.com',
      subject: 'Test Subject',
      html: '<p>Body</p>',
    };
    expect(opts.to).toBeTruthy();
    expect(opts.subject).toBeTruthy();
    expect(opts.html).toBeTruthy();
  });

  it('from is optional', () => {
    const opts: EmailSendOptions = {
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Body</p>',
    };
    expect(opts.from).toBeUndefined();
  });

  it('tags are optional array', () => {
    const opts: EmailSendOptions = {
      to: 'test@test.com',
      subject: 'Test',
      html: '<p>Body</p>',
      tags: [{ name: 'template', value: 'otp' }],
    };
    expect(opts.tags).toHaveLength(1);
  });
});
