// ═══════════════════════════════════════════════════════════════
// DATUN API — Server Entry Point
// Boot sequence: dotenv → sentry → env → redis → db → app → crons → listen
// Graceful shutdown: SIGTERM → stop accepting → drain → close DB → exit
// Pattern: Google Cloud Run, AWS ECS, Railway — all expect graceful shutdown.
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// CRITICAL IMPORT ORDER:
// 1. dotenv/config — loads SENTRY_DSN into process.env
// 2. ./lib/sentry.js — initializes Sentry as SIDE EFFECT (module load)
// 3. Everything else — Sentry hooks now active for instrumentation
// Reference: Sentry v10 docs require init BEFORE Express imports.
// ═══════════════════════════════════════════════════════════════

import 'dotenv/config';
import { Sentry } from './lib/sentry.js';

import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { initRedis, verifyRedis } from './lib/redis.js';
import { createApp } from './app.js';
import { startCronJobs } from './crons/index.js';
import { prisma as basePrisma } from '@repo/db';
import { registerAuditMiddleware } from './lib/prisma-audit.js';

// P2-F8: $extends returns new client — use this everywhere
const prisma = registerAuditMiddleware(basePrisma);
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

  // ── 3. Prisma audit middleware registered at import time (see top of file) ──
  logger.info('✅ Prisma audit extension active ($extends pattern)');

  // ── 4. Create Express app ──
  const app = createApp();

  // ── 5. Start cron jobs ──
  startCronJobs();

  // ── 6. Listen ──
  server = app.listen(env.PORT, () => {
    logger.info(`${BRAND.name} API started on port ${env.PORT}`, {
      version: API_VERSION,
      env: env.NODE_ENV,
      port: env.PORT,
      redis: redisResult.ok ? 'connected' : 'fallback (in-memory)',
    });

    // P2-F23: ASCII art only in dev — production uses structured logs
    if (env.NODE_ENV === 'development') {
      console.log(`
  ╔═══════════════════════════════════════╗
  ║        ${BRAND.name} API Running 🦷           ║
  ║        Port: ${String(env.PORT).padEnd(24)}║
  ║        Version: ${API_VERSION.padEnd(21)}║
  ║        Env: ${env.NODE_ENV.padEnd(25)}║
  ║        Redis: ${(redisResult.ok ? 'Connected ✅' : 'In-memory ⚠️').padEnd(23)}║
  ╚═══════════════════════════════════════╝
      `);
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN — Handle Railway redeploys cleanly
// Without this, in-flight requests get killed on SIGTERM.
// ═══════════════════════════════════════════════════════════════

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — starting graceful shutdown...`);

  // Stop accepting + drain in-flight (server.close awaits all responses)
  if (server) {
    await new Promise<void>((resolve) => {
      server!.close((err) => {
        if (err) logger.warn('Error during server close', { error: err.message });
        else logger.info('HTTP server closed — all in-flight requests completed');
        resolve();
      });

      // P2-F16: 25s hard ceiling (Railway gives 30s before SIGKILL)
      setTimeout(() => {
        logger.warn('Drain timeout reached — forcing close');
        resolve();
      }, 25_000);
    });
  }

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
