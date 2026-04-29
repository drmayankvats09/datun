// ═══════════════════════════════════════════════════════════════
// 24-HOUR WINDOW TRACKER — Meta WhatsApp customer service rule
//
// Meta rule: After a user sends a message, business has 24 hours
// to send free-form text. Beyond 24h → templates only.
// Violation → ban risk after multiple offenses.
//
// Storage: Redis hash wa:window:{phone} → {lastInbound: ms}
// Fallback: in-memory Map (per-container, lossy on restart)
//
// Used by: whatsappClient.sendText (rejects if window closed)
//          webhook router (records inbound to update window)
// ═══════════════════════════════════════════════════════════════

import { cache } from './../../lib/redis.js';
import { logger } from './../../lib/logger.js';

const WINDOW_KEY_PREFIX = 'wa:window:';
const WINDOW_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const WINDOW_TTL_SECONDS = 25 * 60 * 60; // 25 hours (slight buffer)

/**
 * Mark that we received an inbound message from a phone — opens 24h window.
 * Called by webhook router on every incoming message.
 */
export async function markInbound(phone: string): Promise<void> {
  const key = `${WINDOW_KEY_PREFIX}${phone}`;
  const value = String(Date.now());
  await cache.set(key, value, WINDOW_TTL_SECONDS);
}

/**
 * Check if 24h window is currently open for this phone.
 * Returns true if user messaged us within last 24h.
 */
export async function isWindowOpen(phone: string): Promise<boolean> {
  const key = `${WINDOW_KEY_PREFIX}${phone}`;
  const value = await cache.get(key);

  if (!value) return false;

  const lastInbound = Number(value);
  if (!Number.isFinite(lastInbound)) return false;

  const elapsed = Date.now() - lastInbound;
  return elapsed < WINDOW_DURATION_MS;
}

/**
 * Get remaining window duration in milliseconds.
 * Returns 0 if window is closed.
 */
export async function getRemainingWindowMs(phone: string): Promise<number> {
  const key = `${WINDOW_KEY_PREFIX}${phone}`;
  const value = await cache.get(key);

  if (!value) return 0;

  const lastInbound = Number(value);
  if (!Number.isFinite(lastInbound)) return 0;

  const elapsed = Date.now() - lastInbound;
  const remaining = WINDOW_DURATION_MS - elapsed;
  return Math.max(0, remaining);
}

/**
 * Force close a window (e.g. when user replies STOP).
 */
export async function closeWindow(phone: string): Promise<void> {
  const key = `${WINDOW_KEY_PREFIX}${phone}`;
  await cache.del(key);
  logger.info('[WindowTracker] Window force-closed', { phone });
}
