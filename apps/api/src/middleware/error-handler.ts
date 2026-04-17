// ═══════════════════════════════════════════════════════════════
// ERROR HANDLER — Central error → HTTP response mapping
// Custom AppError subtypes → correct status + structured JSON.
// Unknown errors → 500 + Sentry alert (never leak stack to client).
// Pattern: Express 5 native async error handling (no wrapper needed).
// ═══════════════════════════════════════════════════════════════

import type { Request, Response, NextFunction, Express } from 'express';
import { Sentry } from '../lib/sentry.js';
import { logger } from '../lib/logger.js';
import { AppError, ValidationError } from '../errors/index.js';
import { getRequestId, getRequestDurationMs } from '../lib/request-context.js';
import type { ApiResponse } from '../types/index.js';

export function setupErrorHandlers(app: Express): void {
  // Sentry must be registered AFTER all routes (captures unhandled throws)
  Sentry.setupExpressErrorHandler(app);

  // Final handler — converts errors to consistent JSON envelope
  app.use((err: Error, _req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(err);
      return;
    }

    const requestId = getRequestId();
    const durationMs = getRequestDurationMs();

    // Known operational errors — expected, safe to expose
    if (err instanceof AppError && err.isOperational) {
      const body: ApiResponse = {
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
        meta: { requestId, durationMs },
      };

      // Attach validation details if present
      if (err instanceof ValidationError && err.details) {
        body.error!.details = err.details;
      }

      logger.warn('Operational error', {
        requestId,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
      });

      res.status(err.statusCode).json(body);
      return;
    }

    // Unknown/programmer errors — log + Sentry, hide from client
    logger.error('Unhandled error', {
      requestId,
      error: err.message,
      stack: err.stack,
    });
    Sentry.captureException(err);

    const body: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      },
      meta: { requestId, durationMs },
    };

    res.status(500).json(body);
  });
}
