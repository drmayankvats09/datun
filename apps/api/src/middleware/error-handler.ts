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

    // P2-F14: Map Prisma errors to user-friendly responses
    const prismaErr = err as { code?: string; meta?: { target?: string[] } };
    if (prismaErr.code === 'P2002') {
      const field = prismaErr.meta?.target?.[0] ?? 'field';
      logger.warn('Prisma unique constraint violation', { requestId, field });
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: `A record with this ${field} already exists` },
        meta: { requestId, durationMs },
      });
      return;
    }

    if (prismaErr.code === 'P2025') {
      logger.warn('Prisma record not found', { requestId });
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Resource not found' },
        meta: { requestId, durationMs },
      });
      return;
    }

    if (prismaErr.code === 'P2003') {
      logger.warn('Prisma foreign key violation', { requestId });
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_REFERENCE', message: 'Invalid reference to related resource' },
        meta: { requestId, durationMs },
      });
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
