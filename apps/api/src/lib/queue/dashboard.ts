// ═══════════════════════════════════════════════════════════════
// BULL-BOARD DASHBOARD — Mounted at /internal/queues
//
// HTTP Basic Auth protects access (BULL_BOARD_USER + BULL_BOARD_PASSWORD).
// Disabled if QUEUE_REDIS_URL not set (graceful no-op).
// CSP relaxed ONLY for /internal/queues — main API stays locked down.
// Pattern: Linear internal admin tools, Vercel admin queues.
// ═══════════════════════════════════════════════════════════════

import type { Express, Request, Response, NextFunction } from 'express';
import basicAuth from 'express-basic-auth';
import helmet from 'helmet';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { getAllQueues } from './queues.js';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';

const DASHBOARD_PATH = '/internal/queues';

export function mountBullBoard(app: Express): void {
  if (!env.QUEUE_REDIS_URL) {
    logger.info('[Bull-Board] QUEUE_REDIS_URL not set — dashboard disabled');
    return;
  }

  if (!env.BULL_BOARD_PASSWORD) {
    if (env.NODE_ENV === 'production') {
      logger.error('[Bull-Board] BULL_BOARD_PASSWORD missing in production');
      return;
    }
    logger.warn('[Bull-Board] no password set — dashboard accessible in dev only');
  }

  const queues = getAllQueues();
  if (queues.length === 0) {
    logger.warn('[Bull-Board] no queues to display');
    return;
  }

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(DASHBOARD_PATH);

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: 'Datun Queues',
      },
    },
  });

  // ── CSP relaxed ONLY for dashboard route ──
  // bull-board ships React + inline styles; strict global CSP blocks them.
  // Main API CSP (default-src 'none') unchanged — only this path overridden.
  const dashboardCsp = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  });

  // Auth middleware — only mount if password set (prod safety)
  const authMiddleware = env.BULL_BOARD_PASSWORD
    ? basicAuth({
        users: { [env.BULL_BOARD_USER]: env.BULL_BOARD_PASSWORD },
        challenge: true,
        realm: 'Datun Queues',
      })
    : (_req: Request, _res: Response, next: NextFunction) => next();

  app.use(DASHBOARD_PATH, dashboardCsp, authMiddleware, serverAdapter.getRouter());

  logger.info(`[Bull-Board] dashboard mounted at ${DASHBOARD_PATH}`);
}
