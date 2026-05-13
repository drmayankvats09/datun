// apps/api/src/routes/security/csp-report.router.ts
// ═══════════════════════════════════════════════════════════════
// CSP REPORT ROUTER — Receives browser-emitted CSP violation reports
//
// PROTOCOL:
//   Browsers POST violation reports to this endpoint when they enforce
//   CSP and a violation occurs. Two payload formats:
//
//     1. Legacy "application/csp-report" (CSP Level 2):
//        { "csp-report": { "blocked-uri": ..., "violated-directive": ... } }
//
//     2. Modern "application/reports+json" (Reporting API):
//        [{ "type": "csp-violation", "body": { "blockedURL": ..., ... } }]
//
//   This router accepts BOTH and normalizes them before storing.
//
// SECURITY POSTURE:
//   - NO authentication (browser cannot send auth on CSP reports).
//   - Strict rate limit (100/min per IP) — prevents abuse / amplification.
//   - Body size limit (50 KB) — CSP reports are tiny; reject anything bigger.
//   - Strict content-type allowlist — only `application/csp-report` and
//     `application/reports+json` accepted.
//   - Validation via Zod — malformed payloads → 400, no DB write.
//
// IDEMPOTENCY / DEDUP:
//   Same violation arrives many times (one per affected user). Dedup
//   happens in csp-report.service.ts via in-memory LRU.
//
// Pattern: Stripe webhook handler (signature-free intake), Sentry SDK
// dispatch endpoint.
// ═══════════════════════════════════════════════════════════════

import express, { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { recordCspViolation } from '../../services/csp-report.service.js';
import { ValidationError } from '../../errors/index.js';
import { logger } from '../../lib/logger.js';
import { createRedisStore } from '../../middleware/rate-limit-store.js';

export const cspReportRouter = Router();

// ── Rate limiter — strict because endpoint is unauthenticated ──
const cspReportLimiter = rateLimit({
  validate: false, // match existing rate-limit.ts pattern (avoid env-quirk warnings)
  windowMs: 60 * 1000, // 1 minute
  max: 100, // per IP — generous for legitimate users, blocks spam
  keyGenerator(req: Request): string {
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string') return cfIp;
    return req.ip ?? 'unknown';
  },
  store: createRedisStore('rl:csp-report'),
  standardHeaders: true,
  legacyHeaders: false,
  handler(_req: Request, res: Response): void {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many CSP reports. Try again later.',
      },
    });
  },
});

/**
 * Custom body parser — accepts BOTH `application/csp-report` and
 * `application/reports+json` content-types.
 *
 * express.json() by default only handles `application/json` — extending
 * `type` to a function lets us accept the CSP-specific MIME types.
 */
const cspReportBodyParser = express.json({
  limit: '50kb',
  type: (req): boolean => {
    const ct = req.headers['content-type'] ?? '';
    return (
      ct.includes('application/csp-report') ||
      ct.includes('application/reports+json') ||
      ct.includes('application/json') // accept plain JSON too (some bots)
    );
  },
});

/**
 * POST /api/security/csp-report
 *
 * Accepts a CSP violation report (legacy or modern format), validates it,
 * and persists via service layer.
 *
 * Response is always minimal — we don't echo the report (privacy + reduce
 * bandwidth for bot floods).
 */
cspReportRouter.post(
  '/csp-report',
  cspReportLimiter,
  cspReportBodyParser,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const contentType = req.headers['content-type'] ?? '';
      const userAgent = req.headers['user-agent'] ?? null;
      const cfIp = (req.headers['cf-connecting-ip'] as string | undefined) ?? null;
      const xRealIp = (req.headers['x-real-ip'] as string | undefined) ?? null;
      const ip = cfIp ?? xRealIp ?? req.ip ?? 'unknown';

      // Validate + persist via service.
      await recordCspViolation({
        rawPayload: req.body,
        contentType,
        userAgent,
        ip,
      });

      // Spec says 204 No Content is fine; we use 204 to keep response tiny.
      res.status(204).end();
    } catch (err) {
      // Validation errors (Zod parse failure) propagate to global handler.
      // Service-level errors (DB failure) also propagate — alerted via Sentry.
      if (err instanceof ValidationError) {
        // Don't 500 on validation failure — these are malicious/malformed
        // payloads, very common from bots. Log + 400 quietly.
        logger.debug('[csp-report] Validation failed', {
          details: err.details,
        });
      }
      next(err);
    }
  },
);
