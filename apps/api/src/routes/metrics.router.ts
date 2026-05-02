// ═══════════════════════════════════════════════════════════════
// METRICS ROUTER — Prometheus text format for API + queues
//
// Exposes /internal/metrics with auth (same Bull-board credentials).
// Includes queue depth from Redis (live), DB job stats (long-term).
//
// Pattern: Vercel /api/internal/metrics, Railway exposition format.
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import basicAuth from 'express-basic-auth';
import { prisma } from '@repo/db';
import { getAllQueues } from '../lib/queue/queues.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export const metricsRouter = Router();

const auth = env.BULL_BOARD_PASSWORD
  ? basicAuth({
      users: { [env.BULL_BOARD_USER]: env.BULL_BOARD_PASSWORD },
      challenge: true,
      realm: 'Datun Metrics',
    })
  : (
      _req: import('express').Request,
      _res: import('express').Response,
      next: import('express').NextFunction,
    ) => next();

metricsRouter.get('/metrics', auth, async (_req, res) => {
  const lines: string[] = [];

  try {
    // ── API process metrics ──
    lines.push('# HELP datun_api_uptime_seconds API process uptime');
    lines.push('# TYPE datun_api_uptime_seconds gauge');
    lines.push(`datun_api_uptime_seconds ${Math.floor(process.uptime())}`);
    lines.push('');

    const mem = process.memoryUsage();
    lines.push('# HELP datun_api_memory_bytes API memory usage by type');
    lines.push('# TYPE datun_api_memory_bytes gauge');
    lines.push(`datun_api_memory_bytes{type="rss"} ${mem.rss}`);
    lines.push(`datun_api_memory_bytes{type="heapUsed"} ${mem.heapUsed}`);
    lines.push(`datun_api_memory_bytes{type="heapTotal"} ${mem.heapTotal}`);
    lines.push('');

    // ── Live queue depth from Redis ──
    if (env.QUEUE_REDIS_URL) {
      const queues = getAllQueues();
      lines.push('# HELP datun_queue_jobs_count Current job count by queue and state');
      lines.push('# TYPE datun_queue_jobs_count gauge');
      for (const q of queues) {
        try {
          const counts = await q.getJobCounts(
            'waiting',
            'active',
            'completed',
            'failed',
            'delayed',
          );
          lines.push(
            `datun_queue_jobs_count{queue="${q.name}",state="waiting"} ${counts.waiting ?? 0}`,
          );
          lines.push(
            `datun_queue_jobs_count{queue="${q.name}",state="active"} ${counts.active ?? 0}`,
          );
          lines.push(
            `datun_queue_jobs_count{queue="${q.name}",state="completed"} ${counts.completed ?? 0}`,
          );
          lines.push(
            `datun_queue_jobs_count{queue="${q.name}",state="failed"} ${counts.failed ?? 0}`,
          );
          lines.push(
            `datun_queue_jobs_count{queue="${q.name}",state="delayed"} ${counts.delayed ?? 0}`,
          );
        } catch (err) {
          logger.warn(`[Metrics] queue ${q.name} count failed`, {
            error: (err as Error).message,
          });
        }
      }
      lines.push('');
    }

    // ── 24-hour job stats from Postgres ──
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dbStats = await prisma.jobLog.groupBy({
      by: ['queueName', 'status'],
      _count: true,
      where: { queuedAt: { gte: since } },
    });

    if (dbStats.length > 0) {
      lines.push('# HELP datun_jobs_24h_total Jobs processed in last 24h by queue and status');
      lines.push('# TYPE datun_jobs_24h_total counter');
      for (const row of dbStats) {
        lines.push(
          `datun_jobs_24h_total{queue="${row.queueName}",status="${row.status}"} ${row._count}`,
        );
      }
      lines.push('');
    }

    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(lines.join('\n'));
  } catch (err) {
    logger.error('[Metrics] failed to render', { error: (err as Error).message });
    res.status(500).type('text/plain').send('# Error rendering metrics\n');
  }
});
