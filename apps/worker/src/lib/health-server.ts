// ═══════════════════════════════════════════════════════════════
// WORKER HEALTH SERVER — Tiny HTTP server on side port
//
// Exposes:
//   GET /health     → 200 {status,redis,uptimeSec} or 503 if Redis down
//   GET /metrics    → Prometheus text format (worker stats)
//
// Why separate from BullMQ: Railway needs HTTP healthcheck.
// Why not Express: zero deps, one file, 100 lines. Worker stays light.
// Pattern: Linear sync workers, Cal.com workers, every Vercel function.
// ═══════════════════════════════════════════════════════════════

import http from 'node:http';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { getWorkerMetrics } from './metrics.js';

const HEALTH_PORT = 4001;
const PING_TIMEOUT_MS = 3000;

let healthRedis: Redis | null = null;
let healthServer: http.Server | null = null;

function getHealthRedisConnection(): Redis {
  if (healthRedis) return healthRedis;
  const url = new URL(env.QUEUE_REDIS_URL);
  healthRedis = new Redis({
    host: url.hostname,
    port: Number(url.port) || 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    family: 0,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1, // Health check fails fast
    enableOfflineQueue: false,
    ...(url.protocol === 'rediss:' && { tls: {} }),
  });
  healthRedis.on('error', () => {
    // Silent — health endpoint will report status
  });
  return healthRedis;
}

async function pingRedis(): Promise<{ ok: boolean; latencyMs: number }> {
  const conn = getHealthRedisConnection();
  const start = Date.now();
  try {
    const result = await Promise.race([
      conn.ping(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('ping timeout')), PING_TIMEOUT_MS),
      ),
    ]);
    return { ok: result === 'PONG', latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

export function startHealthServer(): void {
  if (healthServer) return;

  healthServer = http.createServer(async (req, res) => {
    // Health check
    if (req.url === '/health' || req.url === '/healthz') {
      const ping = await pingRedis();
      const body = {
        status: ping.ok ? 'healthy' : 'unhealthy',
        redis: ping.ok ? 'connected' : 'disconnected',
        redisLatencyMs: ping.latencyMs,
        uptimeSec: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      };
      res.statusCode = ping.ok ? 200 : 503;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(body));
      return;
    }

    // Prometheus metrics
    if (req.url === '/metrics') {
      const metrics = getWorkerMetrics();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain; version=0.0.4');
      res.end(metrics);
      return;
    }

    // Root info
    if (req.url === '/' || req.url === '') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          service: 'datun-worker',
          status: 'running 🦷',
          endpoints: ['/health', '/metrics'],
        }),
      );
      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  });

  healthServer.listen(HEALTH_PORT, () => {
    logger.info(`[Health] Worker HTTP server listening on port ${HEALTH_PORT}`);
  });

  healthServer.on('error', (err) => {
    logger.error('[Health] Server error', { error: err.message });
  });
}

export async function stopHealthServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!healthServer) {
      resolve();
      return;
    }
    const server = healthServer;
    healthServer = null; // Reset reference BEFORE close so next start() can bind
    server.close(() => {
      logger.info('[Health] Worker HTTP server closed');
      resolve();
    });
    if (healthRedis) {
      healthRedis.disconnect();
      healthRedis = null;
    }
  });
}
