// ═══════════════════════════════════════════════════════════════
// LOGGER REDACT TEST — Verify secret patterns are masked
//
// REGRESSION GUARD: Ensures critical secret patterns never escape
// to logs even if accidentally included in log payload.
//
// IMPORTANT: setup.ts globally mocks '../lib/logger.js' to silence
// log output during tests. We need REAL __internals (redactString,
// redactDeep) for these tests, so we use vi.importActual to bypass
// the global mock and load the actual module.
//
// Pattern: Stripe + Linear use this exact pattern when testing
// modules that are otherwise globally mocked.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeAll } from 'vitest';

// Bypass the global mock from setup.ts — load REAL logger module.
// Must use vi.importActual to get past the auto-mock.
let redactString: (input: string) => string;
let redactDeep: (value: unknown) => unknown;

beforeAll(async () => {
  const actualLogger =
    await vi.importActual<typeof import('../../lib/logger.js')>('../../lib/logger.js');
  redactString = actualLogger.__internals.redactString;
  redactDeep = actualLogger.__internals.redactDeep;
});

describe('Logger redaction — string-level patterns', () => {
  it('redacts Anthropic API keys (sk-ant-*)', () => {
    const input = 'API key sk-ant-abcDEF123456789012345678 leaked';
    const result = redactString(input);
    expect(result).not.toContain('sk-ant-abc');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts OpenAI API keys (sk-*)', () => {
    const input = 'OpenAI key: sk-1234567890abcdefghijklmnopqrstuvwxyz1234';
    const result = redactString(input);
    expect(result).not.toContain('sk-12345');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts Stripe live keys (sk_live_*)', () => {
    const input = 'Stripe key sk_live_abc123def456ghi789jkl012'; // nosemgrep: generic.secrets.security.detected-stripe-api-key
    const result = redactString(input);
    expect(result).not.toContain('sk_live_abc');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts Stripe webhook secrets (whsec_*)', () => {
    const input = 'Webhook signing whsec_abc123def456ghi789jkl012mno';
    const result = redactString(input);
    expect(result).not.toContain('whsec_abc');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts Resend keys (re_*)', () => {
    const input = 'Resend re_AbCdEfGhIjKlMnOpQrStUv key';
    const result = redactString(input);
    expect(result).not.toContain('re_AbCd');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts AWS access keys (AKIA*)', () => {
    const input = 'AWS AKIAIOSFODNN7EXAMPLE creds';
    const result = redactString(input);
    expect(result).not.toContain('AKIAIOSFODNN');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts Bearer tokens', () => {
    const input = 'Authorization: Bearer abc123def456ghi789jkl012mno345pqr';
    const result = redactString(input);
    expect(result).not.toContain('Bearer abc');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts JWT tokens (3-segment base64)', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'; // nosemgrep: generic.secrets.security.detected-jwt-token
    const input = `Token: ${jwt}`;
    const result = redactString(input);
    expect(result).not.toContain('eyJhbGci');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts env-var-style exposures (JWT_SECRET=...)', () => {
    const input = 'Boot: JWT_SECRET=mySuperSecret123ABCdef456';
    const result = redactString(input);
    expect(result).not.toContain('mySuperSecret');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts password in JSON-like context', () => {
    const input = '{"username": "alice", "password": "p@ssw0rd!"}';
    const result = redactString(input);
    expect(result).not.toContain('p@ssw0rd');
    expect(result).toContain('[REDACTED]');
  });

  it('preserves normal log messages without secrets', () => {
    const input = 'User logged in successfully | userId: abc123';
    const result = redactString(input);
    expect(result).toBe(input); // unchanged
  });
});

describe('Logger redaction — deep object traversal', () => {
  it('redacts nested object values', () => {
    const input = {
      message: 'API call failed',
      headers: {
        authorization: 'Bearer sk-1234567890abcdefghijklmnopqrstuvwxyz1234',
      },
    };
    const result = redactDeep(input) as typeof input;
    expect(result.headers.authorization).toContain('[REDACTED]');
    expect(result.headers.authorization).not.toContain('Bearer sk-12345');
  });

  it('redacts inside arrays', () => {
    const input = [
      'normal message',
      'leaked: sk-ant-abc1234567890123456789012',
      { nested: 'sk_live_abc123def456ghi789jkl012' }, // nosemgrep: generic.secrets.security.detected-stripe-api-key
    ];
    const result = redactDeep(input) as typeof input;
    expect(result[0]).toBe('normal message');
    expect(result[1]).toContain('[REDACTED]');
    expect((result[2] as Record<string, string>).nested).toContain('[REDACTED]');
  });

  it('handles null and undefined safely', () => {
    expect(redactDeep(null)).toBe(null);
    expect(redactDeep(undefined)).toBe(undefined);
  });

  it('handles primitives safely', () => {
    expect(redactDeep(42)).toBe(42);
    expect(redactDeep(true)).toBe(true);
    expect(redactDeep('plain text')).toBe('plain text');
  });

  it('handles circular references without crashing', () => {
    const circular: Record<string, unknown> = { name: 'test' };
    circular['self'] = circular;
    const result = redactDeep(circular) as Record<string, unknown>;
    expect(result['name']).toBe('test');
    expect(result['self']).toBe('[Circular]');
  });

  it('preserves Date objects', () => {
    const date = new Date('2026-05-01');
    const input = { timestamp: date, message: 'event' };
    const result = redactDeep(input) as typeof input;
    expect(result.timestamp).toBe(date);
  });

  it('preserves Buffer objects', () => {
    const buf = Buffer.from('test');
    const input = { data: buf };
    const result = redactDeep(input) as typeof input;
    expect(result.data).toBe(buf);
  });

  it('redacts a realistic axios error with secrets in config', () => {
    // Real-world scenario: axios attaches request config to thrown errors,
    // which often contains the auth header
    const axiosError = {
      message: 'Request failed with status 401',
      config: {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'x-api-key': 'sk-ant-real_key_here_1234567890123456',
          'content-type': 'application/json',
        },
      },
      response: {
        status: 401,
        data: { error: 'invalid_api_key' },
      },
    };
    const result = redactDeep(axiosError) as typeof axiosError;
    expect(result.config.headers['x-api-key']).toContain('[REDACTED]');
    expect(result.config.headers['content-type']).toBe('application/json'); // unchanged
    expect(result.message).toBe('Request failed with status 401'); // unchanged
    expect(result.response.status).toBe(401); // numbers preserved
  });
});
