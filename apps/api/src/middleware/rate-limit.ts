// ═══════════════════════════════════════════════════════════════
// RATE LIMITERS — Security events logged when limits hit
// ═══════════════════════════════════════════════════════════════

import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { logSecurityEvent } from '../lib/security-logger.js';

// P2-F18: Use Cloudflare's authenticated IP (cannot be spoofed by attacker)
function keyGen(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp;
  return req.ip ?? 'unknown';
}

function onRateLimitHit(req: Request, limitName: string): void {
  logSecurityEvent({
    event: 'rate_limit.hit',
    ip: (req.headers['x-real-ip'] as string) ?? req.ip ?? 'unknown',
    userAgent: req.headers['user-agent'],
    details: { limiter: limitName, path: req.path, method: req.method },
  });
}

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  keyGenerator: keyGen,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Try again later.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    onRateLimitHit(req, 'general');
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Try again later.' },
    });
  },
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: keyGen,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Slow down! Max 20 messages per minute.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    onRateLimitHit(req, 'chat');
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Slow down! Max 20 messages per minute.' },
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  keyGenerator: keyGen,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many auth attempts. Try again in 5 minutes.',
    },
  },
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
