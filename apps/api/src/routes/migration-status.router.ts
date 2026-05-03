/**
 * Migration Status Route — internal observability endpoint.
 *
 * GET /internal/migration/status
 * Auth: Basic auth (BULL_BOARD_USER / BULL_BOARD_PASSWORD env)
 *
 * Returns full migration system health report. Same auth pattern as
 * /internal/queues (Bull-board) and /internal/metrics — single set of
 * internal credentials shared across observability endpoints.
 *
 * Consumers:
 *   - Better Stack status page widget (status.datunai.com)
 *   - scripts/verify-migration-applied.sh
 *   - Operator manual investigation
 *   - Investor due-diligence reports
 *
 * @see packages/db/src/lib/migration-health.ts
 * @see docs/adr/0002-prisma-migrations-baseline.md
 * @see apps/api/src/routes/metrics.router.ts (same pattern)
 */

import { Router, type Request, type Response } from 'express';
import basicAuth from 'express-basic-auth';
import { prisma, migrations } from '@repo/db';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const router: Router = Router();

// Basic auth middleware — same credentials as Bull-board + metrics
const auth = env.BULL_BOARD_PASSWORD
  ? basicAuth({
      users: { [env.BULL_BOARD_USER]: env.BULL_BOARD_PASSWORD },
      challenge: true,
      realm: 'Datun Migration Status',
    })
  : null;

router.get('/migration/status', ...(auth ? [auth] : []), async (_req: Request, res: Response) => {
  try {
    const [health, auditTrail] = await Promise.all([
      migrations.getMigrationHealth(prisma),
      migrations.getRecentAuditEntries(prisma, 10),
    ]);

    res.json({
      ...health,
      auditTrailLast10: auditTrail,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const error = err as Error;
    logger.error('[migration-status] failed:', error);
    res.status(500).json({
      error: 'migration-status-failed',
      message: error.message,
    });
  }
});

export const migrationStatusRouter = router;
