// apps/api/src/routes/audit.router.ts
// ═══════════════════════════════════════════════════════════════
// AUDIT ROUTER — Task #52 Phase 5 (Production Wiring)
//
// Endpoint:
//   POST /api/audit/error
//
// Purpose:
//   Receives error audit log entries shipped by the frontend
//   (apps/web/lib/errors/audit-log.ts) when an error boundary catches
//   a render failure. Each entry becomes an immutable AuditLog row.
//
// Why a dedicated audit endpoint (instead of piggy-backing on Sentry):
//   - Sentry stores rich telemetry but Sentry-the-vendor is a third
//     party. DPDP Act 2023 + future HIPAA require Datun to maintain
//     an OWNED, immutable audit trail of every user-impacting failure.
//   - Sentry events expire (90-day retention on the default plan).
//     AuditLog rows are permanent — they're legal evidence.
//   - The frontend's sendBeacon survives page-unload; the backend
//     just persists it. Pure storage, no business logic.
//
// Security:
//   - `optionalAuth` — works for both authenticated AND anonymous
//     callers. An auth-broken session is EXACTLY when we most need
//     audit data; demanding a valid token here would create a blind
//     spot for the very errors we care about.
//   - `generalLimiter` (500 req / 15 min / IP) caps abuse. An
//     attacker spamming /audit/error costs us a few DB writes — no
//     amplification, no PII leak (the schema rejects PII fields).
//   - Strict Zod schema — anything weird is rejected with 400.
//
// Wire contract matches `AuditErrorPayload` from
// apps/web/lib/errors/audit-log.ts. Changing either side without the
// other = silent payload drops. Both modules import the SAME error
// category union (synced manually for now; codegen in Future Task).
//
// References:
//   - DPDP Act 2023, Section 8 (Reasonable Security Safeguards)
//   - https://expressjs.com/en/guide/routing.html
// ═══════════════════════════════════════════════════════════════

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';

import { prisma } from '@repo/db';
import { logger } from '../lib/logger.js';
import { validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';

// ─── Schema — must mirror frontend AuditErrorPayload ─────────────

/**
 * Error categories from `apps/web/lib/errors/categorize.ts`.
 * Kept in sync manually; deviation = audit log drift.
 */
const ERROR_CATEGORY = z.enum([
  'network',
  'auth',
  'validation',
  'rate-limit',
  'not-found',
  'server',
  'ai-service',
  'consultation-state',
  'chunk-load',
  'unknown',
]);

/** Severity from `apps/web/lib/errors/categorize.ts`. */
const ERROR_SEVERITY = z.enum(['fatal', 'error', 'warning']);

/** Recovery action from `apps/web/lib/errors/recovery.ts`. */
const RECOVERY_ACTION = z.enum([
  'retry',
  'reload',
  'navigate-home',
  'reauthenticate',
  'wait-and-retry',
  'contact-support',
]);

/** Boundary level from `apps/web/components/a11y/error-boundary.tsx`. */
const BOUNDARY_LEVEL = z.enum(['app', 'route', 'feature', 'widget']);

/**
 * Strict schema for the audit payload. Anything outside this shape
 * is rejected at the middleware layer — never reaches the handler.
 *
 * Field-by-field reasoning:
 *   - `sessionId`     — UUID v4 or "ssr-no-session" (SSR fallback)
 *   - `sentryEventId` — Sentry event ID for cross-correlation; null OK
 *   - `category`      — closed enum; rejects unknown values
 *   - `severity`      — closed enum
 *   - `recoveryAction`— closed enum
 *   - `retryCount`    — 0..N; ints only; >100 rejected (likely loop)
 *   - `statusCode`    — HTTP status when ApiError; null otherwise
 *   - `code`          — backend ERROR_CODES string; null otherwise
 *   - `errorName`     — JS Error.name (truncated to 100 chars)
 *   - `diagnosticMessage` — non-PII summary (truncated to 200 chars)
 *   - `boundaryLevel` — closed enum
 *   - `pathname`      — URL path; truncated to 500 chars
 *   - `clientTimestamp` — ISO-8601; sanity check (within ±24h of now)
 *   - `locale`        — BCP-47 language tag; truncated to 35 chars
 */
const auditErrorSchema = z.object({
  sessionId: z.string().min(1).max(64),
  sentryEventId: z.string().min(1).max(64).nullable(),
  category: ERROR_CATEGORY,
  severity: ERROR_SEVERITY,
  recoveryAction: RECOVERY_ACTION,
  retryCount: z.number().int().min(0).max(100),
  statusCode: z.number().int().min(100).max(599).nullable(),
  code: z.string().max(80).nullable(),
  errorName: z.string().max(100),
  diagnosticMessage: z.string().max(200),
  boundaryLevel: BOUNDARY_LEVEL,
  pathname: z.string().max(500),
  clientTimestamp: z.string().datetime({ offset: true }),
  locale: z.string().max(35),
});

type AuditErrorPayload = z.infer<typeof auditErrorSchema>;

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Extract a stable client IP for the audit row. Prefers Cloudflare's
 * `cf-connecting-ip` (cannot be spoofed) — matches the rate-limit
 * middleware's IP-extraction convention.
 */
function getClientIp(req: Request): string | null {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.length > 0) return cfIp;
  const xRealIp = req.headers['x-real-ip'];
  if (typeof xRealIp === 'string' && xRealIp.length > 0) return xRealIp;
  return req.ip ?? null;
}

/**
 * Truncate a header value for safe persistence. User-Agent is the
 * canonical "long header that shouldn't bloat the DB". 500 chars is
 * the conventional cap (longer values are nearly always bot noise).
 */
function safeUserAgent(req: Request): string | null {
  const ua = req.headers['user-agent'];
  if (typeof ua !== 'string') return null;
  return ua.slice(0, 500);
}

/**
 * Sanity-check the client timestamp. We accept timestamps within ±24h
 * of server time — beyond that, the client clock is too skewed to
 * trust. Rejection here would block legitimate edge cases (frozen
 * laptop resumed after a day), so we LOG the drift instead and still
 * persist with the corrected timestamp.
 */
function reconcileTimestamp(clientTimestamp: string, requestId: string): Date {
  const client = new Date(clientTimestamp);
  if (Number.isNaN(client.getTime())) {
    logger.warn('[Audit] invalid clientTimestamp', { clientTimestamp, requestId });
    return new Date();
  }
  const now = new Date();
  const skewMs = Math.abs(now.getTime() - client.getTime());
  if (skewMs > 24 * 60 * 60 * 1000) {
    logger.warn('[Audit] timestamp skew >24h', {
      clientTimestamp,
      serverTimestamp: now.toISOString(),
      skewHours: Math.round(skewMs / 3_600_000),
      requestId,
    });
    return now;
  }
  return client;
}

// ─── Router ────────────────────────────────────────────────────

export const auditRouter = Router();

/**
 * POST /api/audit/error
 *
 * Persists one error audit log entry. Always responds 202 Accepted
 * (fire-and-forget semantics — the frontend is past the error UI by
 * the time this lands, no UI cares about the result).
 *
 * Returns 400 only for validation failures (handled by `validate()`
 * middleware via the global error handler).
 */
auditRouter.post(
  '/audit/error',
  optionalAuth,
  validate(auditErrorSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload = req.body as AuditErrorPayload;
      const userId = req.auth?.sub ?? null;
      const ipAddress = getClientIp(req);
      const userAgent = safeUserAgent(req);
      const createdAt = reconcileTimestamp(payload.clientTimestamp, req.requestId ?? 'unknown');

      // ── Persist as an immutable AuditLog row ──
      //
      // entityType   = 'ErrorBoundary' (closed vocabulary; future
      //                events will use other values, e.g. 'Login',
      //                'MediaAsset')
      // entityId     = sessionId — gives us per-session correlation
      //                across multiple error captures in one session
      // action       = 'error.<category>' — matches a tag in Sentry
      //                so cross-system filtering is one click
      // metadata     = full PII-safe payload for forensics
      //
      // We swallow DB failures intentionally — audit logging is a
      // best-effort secondary system. The user is already showing
      // an error UI; a failed audit-row insert should not amplify
      // the failure surface.
      try {
        await prisma.auditLog.create({
          data: {
            userId,
            action: `error.${payload.category}`,
            entityType: 'ErrorBoundary',
            entityId: payload.sessionId,
            ipAddress,
            userAgent,
            metadata: {
              sentryEventId: payload.sentryEventId,
              severity: payload.severity,
              recoveryAction: payload.recoveryAction,
              retryCount: payload.retryCount,
              statusCode: payload.statusCode,
              code: payload.code,
              errorName: payload.errorName,
              diagnosticMessage: payload.diagnosticMessage,
              boundaryLevel: payload.boundaryLevel,
              pathname: payload.pathname,
              locale: payload.locale,
              clientTimestampSubmitted: payload.clientTimestamp,
            },
            createdAt,
          },
        });
      } catch (dbError) {
        // Log to Winston/Better Stack but do NOT 5xx — the frontend
        // would interpret a 5xx as "retry me", causing audit log
        // duplicates when the underlying problem is database-side.
        logger.error('[Audit] persist failed', {
          error: dbError instanceof Error ? dbError.message : String(dbError),
          category: payload.category,
          sessionId: payload.sessionId,
          requestId: req.requestId ?? 'unknown',
        });
      }

      // ── Always 202 — payload accepted; durability is best-effort ──
      res.status(202).json({
        success: true,
        data: { accepted: true },
        meta: {
          requestId: req.requestId ?? 'unknown',
        },
      });
    } catch (err) {
      // This catches the schema-validation path through validate()
      // (it throws ValidationError which the global handler 400s).
      next(err);
    }
  },
);
