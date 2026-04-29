// ═══════════════════════════════════════════════════════════════
// WEBHOOK SIGNATURE VERIFIER — Anti-spoofing layer
//
// Meta: HMAC-SHA256(body, META_APP_SECRET) → x-hub-signature-256
// Gupshup: HMAC-SHA256(body, GUPSHUP_WEBHOOK_SECRET) → x-gs-signature
//
// Production: BOTH must verify. Dev: skip if secret not configured (sandbox).
// Reads process.env directly (not cached env module) so tests can flip
// NODE_ENV at runtime to validate prod-vs-dev branches.
// ═══════════════════════════════════════════════════════════════

import crypto from 'node:crypto';
import { logger } from '../../lib/logger.js';
import type { WhatsAppProviderName } from './types.js';

export interface SignatureVerificationInput {
  provider: WhatsAppProviderName;
  signature: string | undefined;
  rawBody: string;
}

/**
 * Verify a webhook signature. Returns true if valid OR if dev-mode skip applies.
 * Production NEVER skips for known providers.
 */
export function verifyWebhookSignature(input: SignatureVerificationInput): boolean {
  const { provider, signature, rawBody } = input;

  if (provider === 'meta') {
    return verifyMetaSignature(signature, rawBody);
  }
  if (provider === 'gupshup') {
    return verifyGupshupSignature(signature, rawBody);
  }
  // Unknown provider — reject in prod, allow in dev
  return process.env['NODE_ENV'] !== 'production';
}

function verifyMetaSignature(signature: string | undefined, rawBody: string): boolean {
  const secret = process.env['META_APP_SECRET'];
  const isProduction = process.env['NODE_ENV'] === 'production';

  if (isProduction) {
    if (!signature || !secret) {
      logger.error('[SigVerify] Meta: missing signature or secret in production');
      return false;
    }
  } else {
    if (!signature || !secret) return true; // dev sandbox bypass
  }

  try {
    const expected = 'sha256=' + crypto.createHmac('sha256', secret!).update(rawBody).digest('hex');
    return safeEqual(signature!, expected);
  } catch (err) {
    logger.error('[SigVerify] Meta: verification error', {
      error: (err as Error).message,
    });
    return false;
  }
}

function verifyGupshupSignature(signature: string | undefined, rawBody: string): boolean {
  const secret = process.env['GUPSHUP_WEBHOOK_SECRET'];
  const isProduction = process.env['NODE_ENV'] === 'production';

  if (isProduction) {
    if (!signature || !secret) {
      logger.error('[SigVerify] Gupshup: missing signature or secret in production');
      return false;
    }
  } else {
    if (!signature || !secret) return true; // dev sandbox bypass
  }

  try {
    const expected = crypto.createHmac('sha256', secret!).update(rawBody).digest('hex');
    return safeEqual(signature!, expected);
  } catch (err) {
    logger.error('[SigVerify] Gupshup: verification error', {
      error: (err as Error).message,
    });
    return false;
  }
}

/** Constant-time comparison to prevent timing attacks. Returns false on length mismatch. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
