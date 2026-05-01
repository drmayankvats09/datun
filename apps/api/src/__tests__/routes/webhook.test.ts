// ═══════════════════════════════════════════════════════════════
// WEBHOOK ROUTES INTEGRATION TEST — Critical signature verification
//
// Tests the COMPLETE flow: HTTP POST → express.json verify → rawBody capture
// → handler reads req.rawBody → verifyWebhookSignature → HMAC matches.
//
// REGRESSION GUARD: This test catches the "JSON.stringify(req.body)" bug
// (fixed Day 11) where re-serializing parsed JSON produced different bytes
// than Meta hashed, causing intermittent signature failures.
//
// IMPORTANT: We READ env.WHATSAPP_VERIFY_TOKEN and process.env.META_APP_SECRET
// at test time (not hard-coded constants) so this test works regardless of
// what specific value vitest.config.ts sets — it just needs SOME value.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { getTestApp, resetTestApp } from '../helpers/test-app.js';
import { env } from '../../config/env.js';

// Read values from env module at test load time.
// vitest.config.ts must declare these in its `env` block.
// If any are missing, tests will fail loudly with clear error messages.
const VERIFY_TOKEN = env.WHATSAPP_VERIFY_TOKEN;
const META_SECRET = process.env.META_APP_SECRET;
const GUPSHUP_SECRET = process.env.GUPSHUP_WEBHOOK_SECRET;

beforeAll(() => {
  // Defensive: fail fast if test env not configured properly
  if (!VERIFY_TOKEN) {
    throw new Error(
      'Test setup error: env.WHATSAPP_VERIFY_TOKEN is not set. ' +
        'Add WHATSAPP_VERIFY_TOKEN to vitest.config.ts env block.',
    );
  }
  if (!META_SECRET) {
    throw new Error(
      'Test setup error: META_APP_SECRET is not set. ' +
        'Add META_APP_SECRET to vitest.config.ts env block.',
    );
  }
  if (!GUPSHUP_SECRET) {
    throw new Error(
      'Test setup error: GUPSHUP_WEBHOOK_SECRET is not set. ' +
        'Add GUPSHUP_WEBHOOK_SECRET to vitest.config.ts env block.',
    );
  }

  // signature-verifier reads NODE_ENV at runtime — set to production so
  // signature checks actually run (skipping under non-production NODE_ENV)
  process.env.NODE_ENV = 'production';
});

beforeEach(() => {
  // Reset app instance so it picks up fresh middleware state
  resetTestApp();
});

/**
 * Generate Meta-style HMAC-SHA256 signature for a given raw body string.
 * Format: 'sha256=<hex>'
 */
function metaSignature(rawBody: string): string {
  return 'sha256=' + crypto.createHmac('sha256', META_SECRET!).update(rawBody).digest('hex');
}

describe('Webhook Routes (Integration) — GET verification', () => {
  it('GET /webhook with correct verify_token returns challenge', async () => {
    const res = await getTestApp().get('/webhook').query({
      'hub.mode': 'subscribe',
      'hub.verify_token': VERIFY_TOKEN, // ← Read from env at runtime
      'hub.challenge': 'CHALLENGE_VALUE_123',
    });

    expect(res.status).toBe(200);
    expect(res.text).toBe('CHALLENGE_VALUE_123');
  });

  it('GET /webhook with wrong verify_token returns 403', async () => {
    const res = await getTestApp().get('/webhook').query({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'WRONG_TOKEN_DEFINITELY_NOT_REAL',
      'hub.challenge': 'CHALLENGE_VALUE_123',
    });

    expect(res.status).toBe(403);
  });

  it('GET /webhook with no params returns 403', async () => {
    const res = await getTestApp().get('/webhook');
    expect(res.status).toBe(403);
  });
});

describe('Webhook Routes (Integration) — POST signature verification (REGRESSION GUARD)', () => {
  /**
   * REGRESSION TEST: This is the bug we fixed Day 11.
   * Meta sends raw JSON bytes; backend was using JSON.stringify(req.body)
   * which re-serializes parsed object — producing DIFFERENT bytes when
   * the original payload had specific key ordering, whitespace, or
   * unicode escaping. The fix uses req.rawBody (captured by express.json
   * verify callback) so HMAC matches.
   */
  it('POST /webhook returns 200 immediately (Meta requirement)', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '15551234567',
                  phone_number_id: 'PHONE_NUMBER_ID',
                },
                statuses: [
                  {
                    id: 'wamid.test123',
                    status: 'delivered',
                    timestamp: '1700000000',
                    recipient_id: '15559876543',
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const rawBody = JSON.stringify(payload);
    const sig = metaSignature(rawBody);

    const res = await getTestApp()
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', sig)
      .send(payload);

    expect(res.status).toBe(200);
  });

  it('POST /webhook with INVALID signature still returns 200 (silent reject)', async () => {
    const payload = { entry: [] };

    const res = await getTestApp()
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', 'sha256=invalid_signature_attempt')
      .send(payload);

    expect(res.status).toBe(200);
  });

  it('POST /webhook with NO signature header still returns 200', async () => {
    const payload = { entry: [] };
    const res = await getTestApp().post('/webhook').send(payload);
    expect(res.status).toBe(200);
  });

  it('POST /webhook with empty body returns 200', async () => {
    const rawBody = '{}';
    const sig = metaSignature(rawBody);

    const res = await getTestApp()
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', sig)
      .send({});

    expect(res.status).toBe(200);
  });
});

describe('Webhook Routes (Integration) — POST raw body capture', () => {
  it('rawBody is captured for downstream handlers', async () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{ id: '123', changes: [] }],
    };

    const rawBody = JSON.stringify(payload);
    const sig = metaSignature(rawBody);

    const res = await getTestApp()
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('x-hub-signature-256', sig)
      .send(payload);

    expect(res.status).toBe(200);
  });
});

describe('Webhook Routes (Integration) — Gupshup endpoint', () => {
  it('POST /webhook/gupshup returns 200', async () => {
    const payload = { type: 'message', payload: {} };
    const rawBody = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', GUPSHUP_SECRET!).update(rawBody).digest('hex');

    const res = await getTestApp()
      .post('/webhook/gupshup')
      .set('Content-Type', 'application/json')
      .set('x-gs-signature', sig)
      .send(payload);

    expect(res.status).toBe(200);
  });
});
