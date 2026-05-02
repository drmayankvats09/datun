// ═══════════════════════════════════════════════════════════════
// BULL-BOARD DASHBOARD — Mounted at /internal/queues
//
// HTTP Basic Auth protects access (BULL_BOARD_USER + BULL_BOARD_PASSWORD).
// Disabled if QUEUE_REDIS_URL not set (graceful no-op).
// Pattern: Linear internal admin tools, Vercel admin queues.
// ═══════════════════════════════════════════════════════════════

import type { Express } from 'express';
import basicAuth from 'express-basic-auth';
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

  // Auth middleware — only mount if password set (prod safety)
  const authMiddleware = env.BULL_BOARD_PASSWORD
    ? basicAuth({
        users: { [env.BULL_BOARD_USER]: env.BULL_BOARD_PASSWORD },
        challenge: true,
        realm: 'Datun Queues',
      })
    : (_req: unknown, _res: unknown, next: () => void) => next();

  app.use(DASHBOARD_PATH, authMiddleware, serverAdapter.getRouter());

  logger.info(`[Bull-Board] dashboard mounted at ${DASHBOARD_PATH}`);
}
