// ═══════════════════════════════════════════════════════════════
// REQUEST ID MIDDLEWARE — Unique trace ID per request
// Client can send X-Request-ID; we generate if missing.
// ID propagates to logs, Sentry, error responses.
// Pattern: AWS X-Ray, Google Cloud Trace, Stripe Request-Id.
// ═══════════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { requestStore } from '../lib/request-context.js';
import { logger } from '../lib/logger.js';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? nanoid(21);
  const startedAt = Date.now();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Run entire request inside AsyncLocalStorage context
  requestStore.run({ requestId, startedAt }, () => {
    // Log incoming request
    logger.info('→ request', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent')?.slice(0, 100),
    });

    // Log response when finished
    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      logger.info('← response', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs,
      });
    });

    next();
  });
}
