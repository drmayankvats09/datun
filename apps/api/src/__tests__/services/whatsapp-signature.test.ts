// ═══════════════════════════════════════════════════════════════
// SIGNATURE VERIFIER TESTS — Anti-spoof HMAC verification
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from '../../services/whatsapp/signature-verifier.js';

const META_SECRET = 'meta-test-secret';
const GUPSHUP_SECRET = 'gupshup-test-secret';

beforeEach(() => {
  process.env.META_APP_SECRET = META_SECRET;
  process.env.GUPSHUP_WEBHOOK_SECRET = GUPSHUP_SECRET;
  process.env.NODE_ENV = 'production';
});

function metaSig(body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', META_SECRET).update(body).digest('hex');
}

function gupshupSig(body: string): string {
  return crypto.createHmac('sha256', GUPSHUP_SECRET).update(body).digest('hex');
}

describe('verifyWebhookSignature — Meta', () => {
  it('accepts valid signature', () => {
    const body = JSON.stringify({ entry: [] });
    const ok = verifyWebhookSignature({
      provider: 'meta',
      signature: metaSig(body),
      rawBody: body,
    });
    expect(ok).toBe(true);
  });

  it('rejects invalid signature', () => {
    const body = JSON.stringify({ entry: [] });
    const ok = verifyWebhookSignature({
      provider: 'meta',
      signature: 'sha256=invalid',
      rawBody: body,
    });
    expect(ok).toBe(false);
  });

  it('rejects missing signature in production', () => {
    const ok = verifyWebhookSignature({
      provider: 'meta',
      signature: undefined,
      rawBody: '{}',
    });
    expect(ok).toBe(false);
  });

  it('allows missing signature in dev', () => {
    process.env.NODE_ENV = 'development';
    const ok = verifyWebhookSignature({
      provider: 'meta',
      signature: undefined,
      rawBody: '{}',
    });
    expect(ok).toBe(true);
  });

  it('rejects tampered body', () => {
    const body = JSON.stringify({ entry: [] });
    const sig = metaSig(body);
    const tampered = JSON.stringify({ entry: ['hacked'] });
    const ok = verifyWebhookSignature({
      provider: 'meta',
      signature: sig,
      rawBody: tampered,
    });
    expect(ok).toBe(false);
  });
});

describe('verifyWebhookSignature — Gupshup', () => {
  it('accepts valid Gupshup signature', () => {
    const body = JSON.stringify({ type: 'message' });
    const ok = verifyWebhookSignature({
      provider: 'gupshup',
      signature: gupshupSig(body),
      rawBody: body,
    });
    expect(ok).toBe(true);
  });

  it('rejects wrong-format signature', () => {
    const body = JSON.stringify({ type: 'message' });
    const ok = verifyWebhookSignature({
      provider: 'gupshup',
      signature: 'definitely-not-hmac',
      rawBody: body,
    });
    expect(ok).toBe(false);
  });

  it('does not accept Meta signature for Gupshup', () => {
    const body = JSON.stringify({ type: 'message' });
    const sigMeta = metaSig(body); // wrong format for Gupshup
    const ok = verifyWebhookSignature({
      provider: 'gupshup',
      signature: sigMeta,
      rawBody: body,
    });
    expect(ok).toBe(false);
  });
});

describe('verifyWebhookSignature — edge cases', () => {
  it('constant-time compare prevents timing attacks', () => {
    // Just verify it doesn't throw on length-mismatched inputs
    const ok = verifyWebhookSignature({
      provider: 'meta',
      signature: 'sha256=abc',
      rawBody: 'test',
    });
    expect(ok).toBe(false);
  });

  it('handles empty body', () => {
    const ok = verifyWebhookSignature({
      provider: 'meta',
      signature: metaSig(''),
      rawBody: '',
    });
    expect(ok).toBe(true);
  });
});
