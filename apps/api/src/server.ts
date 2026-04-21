// ═══════════════════════════════════════════════════════════════
// DATUN API — Server Entry Point
// Boot sequence: dotenv → sentry → env → redis → db → app → crons → listen
// Graceful shutdown: SIGTERM → stop accepting → drain → close DB → exit
// Pattern: Google Cloud Run, AWS ECS, Railway — all expect graceful shutdown.
// ═══════════════════════════════════════════════════════════════

import 'dotenv/config';

// Sentry MUST init before anything else (captures boot errors too)
import { initSentry, Sentry } from './lib/sentry.js';
initSentry();

import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { initRedis, verifyRedis } from './lib/redis.js';
import { createApp } from './app.js';
import { startCronJobs } from './crons/index.js';
import { prisma } from '@repo/db';
import { BRAND, API_VERSION } from '@repo/shared';
import type { Server } from 'node:http';

let server: Server | null = null;

async function main(): Promise<void> {
  // ── 1. Initialize Redis (non-blocking — falls back to in-memory) ──
  initRedis();
  const redisResult = await verifyRedis();
  if (!redisResult.ok) {
    logger.warn('Redis not available — OTP/cache/alerts using in-memory fallback');
  }

  // ── 2. Verify database connection ──
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    logger.info(`✅ Database connected (${Date.now() - dbStart}ms)`);
  } catch (err) {
    logger.error('❌ Database connection failed', {
      error: (err as Error).message,
    });
    Sentry.captureException(err);
    process.exit(1);
  }

  // ── 3. Create Express app ──
  const app = createApp();

  // ── 4. Start cron jobs ──
  startCronJobs();

  // ── 5. Listen ──
  server = app.listen(env.PORT, () => {
    logger.info(`${BRAND.name} API started on port ${env.PORT}`, {
      version: API_VERSION,
      env: env.NODE_ENV,
      port: env.PORT,
      redis: redisResult.ok ? 'connected' : 'fallback (in-memory)',
    });

    console.log(`
  ╔═══════════════════════════════════════╗
  ║        ${BRAND.name} API Running 🦷           ║
  ║        Port: ${String(env.PORT).padEnd(24)}║
  ║        Version: ${API_VERSION.padEnd(21)}║
  ║        Env: ${env.NODE_ENV.padEnd(25)}║
  ║        Redis: ${(redisResult.ok ? 'Connected ✅' : 'In-memory ⚠️').padEnd(23)}║
  ╚═══════════════════════════════════════╝
    `);
  });
}

// ═══════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN — Handle Railway redeploys cleanly
// Without this, in-flight requests get killed on SIGTERM.
// ═══════════════════════════════════════════════════════════════

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed — no new connections');
    });
  }

  // Give in-flight requests 10 seconds to finish
  await new Promise((resolve) => setTimeout(resolve, 10_000));

  // Close database connection pool
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (err) {
    logger.error('Error disconnecting database', {
      error: (err as Error).message,
    });
  }

  // Flush Sentry events
  try {
    await Sentry.close(5000);
  } catch {
    // Silent
  }

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled rejections (should be rare with proper error handling)
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  Sentry.captureException(reason);
});

// Start
main().catch((err) => {
  logger.error('Fatal startup error', { error: (err as Error).message });
  Sentry.captureException(err);
  process.exit(1);
});
