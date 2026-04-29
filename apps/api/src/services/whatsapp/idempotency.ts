// ═══════════════════════════════════════════════════════════════
// WEBHOOK IDEMPOTENCY — Duplicate webhook detection
//
// Meta Cloud API: Retries every webhook 5 times within ~5min if
// no 200 OK received within 5 seconds.
// Gupshup: Similar retry behavior.
//
// Strategy: SETNX with 24h TTL on provider message ID (wamid).
// First arrival → returns true (process). Repeats → returns false (skip).
//
// Storage: Redis (Upstash). Fallback: in-memory (per-container).
// ═══════════════════════════════════════════════════════════════

import { cache } from './../../lib/redis.js';
import { logger } from './../../lib/logger.js';

const IDEMPOTENCY_KEY_PREFIX = 'wa:wamid:';
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Check if this webhook is being processed for the first time.
 * Returns true → process it. Returns false → skip (duplicate).
 */
export async function claimWebhook(messageId: string): Promise<boolean> {
  if (!messageId || messageId === 'unknown') {
    // Without an ID we cannot dedup — process anyway
    return true;
  }

  const key = `${IDEMPOTENCY_KEY_PREFIX}${messageId}`;

  try {
    // SETNX semantics — only set if not exists
    const wasSet = await cache.setNX(key, '1', IDEMPOTENCY_TTL_SECONDS);

    if (!wasSet) {
      logger.info('[Idempotency] Duplicate webhook skipped', { messageId });
      return false;
    }

    return true;
  } catch (err) {
    // Redis failure must not block webhook processing — process anyway
    logger.error('[Idempotency] Redis error, processing anyway', {
      messageId,
      error: (err as Error).message,
    });
    return true;
  }
}
