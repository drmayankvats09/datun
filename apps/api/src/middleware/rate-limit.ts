// ═══════════════════════════════════════════════════════════════
// RATE LIMITERS — Redis-backed distributed counters
// Phase 7: Switched from in-memory Map to Redis store.
//
// Why Redis-backed:
//   - In-memory = per-instance counter (Railway scales to 2+)
//   - Attacker hits instance A (10 tries) + instance B (10 tries) = 20 total
//   - Redis = shared counter = attacker gets 10 total, period
//   - Automatic in-memory fallback when Redis unavailable
//
// Three tiers:
//   general  — 500 req/15min (all /api/* routes)
//   chat     — 20 msg/min (AI chat — expensive, must throttle)
//   auth     — 10 req/5min (login/signup — brute force protection)
//
// Pattern: Google Cloud Endpoints, Stripe API, AWS API Gateway.
// ═══════════════════════════════════════════════════════════════

import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { logSecurityEvent } from '../lib/security-logger.js';
import { createRedisStore } from './rate-limit-store.js';

// ── IP Extraction ──
// Cloudflare's cf-connecting-ip is the REAL client IP (cannot be spoofed).
// x-forwarded-for can be manipulated by attacker — cf-connecting-ip cannot.
// Fallback to req.ip for local dev (no Cloudflare).
function keyGen(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp;
  return req.ip ?? 'unknown';
}

// ── Security Logging ──
// Every rate limit hit is logged to Winston + Better Stack.
// Pattern: fail2ban-style detection — 3+ hits in a row = suspicious.
function onRateLimitHit(req: Request, limitName: string): void {
  logSecurityEvent({
    event: 'rate_limit.hit',
    ip: (req.headers['x-real-ip'] as string) ?? req.ip ?? 'unknown',
    userAgent: req.headers['user-agent'],
    details: { limiter: limitName, path: req.path, method: req.method },
  });
}

// ═══════════════════════════════════════════════════════════════
// 1. GENERAL LIMITER — All /api/* routes
//    500 requests per 15 minutes per IP.
//    Generous for normal users, catches scrapers/bots.
// ═══════════════════════════════════════════════════════════════

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  keyGenerator: keyGen,
  store: createRedisStore('rl:general'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    onRateLimitHit(req, 'general');
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Try again later.',
      },
    });
  },
});

// ═══════════════════════════════════════════════════════════════
// 2. CHAT LIMITER — AI chat endpoint only
//    20 messages per minute per IP.
//    Each chat message costs ₹0.5-2 in AI API — must throttle.
//    Normal conversation: 2-3 messages/min. 20 = generous buffer.
// ═══════════════════════════════════════════════════════════════

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  keyGenerator: keyGen,
  store: createRedisStore('rl:chat'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    onRateLimitHit(req, 'chat');
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Slow down! Max 20 messages per minute.',
      },
    });
  },
});

// ═══════════════════════════════════════════════════════════════
// 3. AUTH LIMITER — Login, signup, OTP, forgot-password
//    10 attempts per 5 minutes per IP.
//    Brute force protection. Hit = suspicious.brute_force event.
//    Pattern: Auth0 (10/min), Clerk (5/min), Stripe (100/hr).
// ═══════════════════════════════════════════════════════════════

export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  keyGenerator: keyGen,
  store: createRedisStore('rl:auth'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logSecurityEvent({
      event: 'suspicious.brute_force',
      ip: (req.headers['x-real-ip'] as string) ?? req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'],
      details: { limiter: 'auth', path: req.path, method: req.method },
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many auth attempts. Try again in 5 minutes.',
      },
    });
  },
});
