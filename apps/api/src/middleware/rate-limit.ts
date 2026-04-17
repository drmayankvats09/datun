// ═══════════════════════════════════════════════════════════════
// RATE LIMITERS — Tiered by endpoint sensitivity
// AI chat = expensive (Claude API costs). Auth = abuse target.
// General API = generous for normal usage.
// ═══════════════════════════════════════════════════════════════

import rateLimit from 'express-rate-limit';

/** General API — 500 requests / 15 min per IP */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Try again later.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** AI Chat — 20 messages / min per IP (Claude costs money) */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Slow down! Max 20 messages per minute.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Auth — 10 attempts / 5 min per IP (prevent brute force) */
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many auth attempts. Try again in 5 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});
