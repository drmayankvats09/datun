// apps/api/src/services/csp-report.service.ts
// ═══════════════════════════════════════════════════════════════
// CSP REPORT SERVICE — Persistence + alerting for CSP violations
//
// RESPONSIBILITIES:
//   1. Validate the raw payload (via Zod).
//   2. Normalize legacy + modern report formats into a unified shape.
//   3. Compute severity (script-src = critical, etc.).
//   4. Classify ipHash (SHA-256, salted — DPDP-grade privacy).
//   5. Deduplicate via in-memory LRU (csp-report-dedup.ts).
//   6. Persist to `csp_violations` Prisma table.
//   7. Trigger Sentry alert for CRITICAL severity violations.
//
// PRIVACY:
//   We NEVER store raw IP addresses (DPDP Act compliance — IP is PII
//   when paired with timestamp). Instead, ipHash = SHA-256(ip + secret_salt)
//   so we can deduplicate by source without exposing the IP.
//
// PERFORMANCE:
//   - Dedup is hot path → in-memory LRU (no DB lookup).
//   - DB writes are fire-and-forget but errors bubble up via Sentry.
//   - Sentry alert capped to CRITICAL severity (avoid alert fatigue).
//
// Pattern: Stripe events ingestion (with rate-limiting + dedup),
//          Sentry's own webhook intake service.
// ═══════════════════════════════════════════════════════════════

import { createHash } from 'node:crypto';
import { prisma } from '@repo/db';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';
import { getRequestId } from '../lib/request-context.js';
import { parseCspReport, normalizeReport } from '../validators/csp-report.validator.js';
import { env } from '../config/env.js';
import { isDuplicate } from './csp-report-dedup.js';

/** Salt for IP hashing — read from env at module load. */
const IP_HASH_SALT = env.CSP_IP_HASH_SALT ?? 'datun-csp-default-salt-rotate-me-dev-only';

/** Severity classification mirror of web/lib/csp/sentry-integration.ts. */
type Severity = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_MAP: Record<string, Severity> = {
  'script-src': 'critical',
  'script-src-elem': 'critical',
  'script-src-attr': 'critical',
  'connect-src': 'high',
  'frame-src': 'high',
  'frame-ancestors': 'high',
  'object-src': 'high',
  'form-action': 'high',
  'base-uri': 'high',
  'style-src': 'medium',
  'style-src-elem': 'medium',
  'style-src-attr': 'medium',
  'worker-src': 'medium',
  'img-src': 'low',
  'font-src': 'low',
  'media-src': 'low',
  'manifest-src': 'low',
};

function classifySeverity(effectiveDirective: string): Severity {
  const directive = effectiveDirective.split(/\s+/)[0] ?? '';
  return SEVERITY_MAP[directive] ?? 'low';
}

function hashIp(ip: string): string {
  return createHash('sha256')
    .update(ip + IP_HASH_SALT, 'utf8')
    .digest('hex');
}

/** Public input shape from router. */
export interface RecordViolationInput {
  rawPayload: unknown;
  contentType: string;
  userAgent: string | null;
  ip: string;
}

/**
 * Validate, dedupe, and persist a CSP violation.
 *
 * Always returns `void` — success or controlled failure. Throws only for
 * validation errors (caught by global handler → 400 response).
 */
export async function recordCspViolation(input: RecordViolationInput): Promise<void> {
  // 1. Validate the raw payload (throws ValidationError on malformed).
  const parsed = parseCspReport(input.rawPayload, input.contentType);

  // 2. Normalize legacy / modern format into a unified shape.
  const normalized = normalizeReport(parsed);

  const severity = classifySeverity(normalized.effectiveDirective);
  const ipHash = hashIp(input.ip);

  // 3. Deduplicate — same (blocked-uri, directive) from same source within 1hr.
  const dedupKey = `${ipHash}|${normalized.blockedUri}|${normalized.effectiveDirective}`;
  if (isDuplicate(dedupKey)) {
    // Increment counter on existing row if found (best-effort).
    try {
      await prisma.cspViolation.updateMany({
        where: {
          ipHash,
          blockedUri: normalized.blockedUri,
          effectiveDirective: normalized.effectiveDirective,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // last 1 hour
        },
        data: { dedupCount: { increment: 1 } },
      });
    } catch (err) {
      logger.debug('[csp-report] Dedup increment failed', { error: (err as Error).message });
    }
    return;
  }

  // 4. Persist new violation.
  try {
    const created = await prisma.cspViolation.create({
      data: {
        blockedUri: normalized.blockedUri,
        documentUri: normalized.documentUri,
        violatedDirective: normalized.violatedDirective,
        effectiveDirective: normalized.effectiveDirective,
        originalPolicy: normalized.originalPolicy,
        statusCode: normalized.statusCode,
        scriptSample: normalized.scriptSample,
        sourceFile: normalized.sourceFile,
        lineNumber: normalized.lineNumber,
        columnNumber: normalized.columnNumber,
        disposition: normalized.disposition,
        userAgent: input.userAgent,
        ipHash,
        requestId: getRequestId(),
        severity,
        dedupCount: 1,
      },
    });

    // 5. Sentry alert for CRITICAL severity only (avoid alert fatigue).
    if (severity === 'critical') {
      Sentry.captureMessage(
        `[CSP CRITICAL] ${normalized.effectiveDirective} blocked: ${normalized.blockedUri}`,
        'error',
      );
      logger.warn('[csp-report] CRITICAL violation captured', {
        id: created.id,
        directive: normalized.effectiveDirective,
        blockedUri: normalized.blockedUri,
      });
    } else {
      logger.info('[csp-report] Violation recorded', {
        id: created.id,
        severity,
        directive: normalized.effectiveDirective,
      });
    }
  } catch (err) {
    // DB failure — log loudly, alert Sentry, but don't fail the HTTP request.
    // Reason: browsers retry on 5xx → amplification. Better to swallow.
    logger.error('[csp-report] DB write failed', {
      error: (err as Error).message,
      directive: normalized.effectiveDirective,
    });
    Sentry.captureException(err, { tags: { component: 'csp-report' } });
  }
}
