// ═══════════════════════════════════════════════════════════════
// HEALTH ROUTES — FAANG-grade deep health check
// DB, Redis, Auth, AI providers, WhatsApp, Email, Memory.
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { prisma } from '@repo/db';
import { BRAND, API_VERSION } from '@repo/shared';
import { env } from '../config/env.js';
import { whatsappHealthCheck } from '../services/whatsapp/index.js';
import { JwtService } from '../services/auth/jwt.service.js';
import { verifyRedis } from '../lib/redis.js';
import { getAIHealth } from '../services/ai/index.js';

/**
 * Auth subsystem health — cached for 60s.
 * Verifies JWT_SECRET integrity + JwtService availability without
 * generating real user tokens on every probe.
 *
 * Why cache: UptimeRobot + Checkly + BetterStack + monitors hit
 * /health every 5 min from multiple sources = ~48 hits/hour.
 * Without cache: 48 real JWT generations + 48 verifications +
 * 48 auth log entries per hour. With cache: 1/min worst case.
 *
 * Pattern: Stripe /healthz, AWS ELB target group health checks —
 * lightweight checks with TTL caching.
 */
let authHealthCache: { ok: boolean; checkedAt: number; latencyMs: number; error?: string } | null =
  null;
const AUTH_HEALTH_TTL_MS = 60_000;

function checkAuthHealth(): { status: string; latencyMs?: number; error?: string } {
  // Cache hit
  if (authHealthCache && Date.now() - authHealthCache.checkedAt < AUTH_HEALTH_TTL_MS) {
    if (authHealthCache.ok) {
      return { status: 'ok', latencyMs: authHealthCache.latencyMs };
    }
    return { status: 'fail', error: authHealthCache.error ?? 'cached failure' };
  }

  // Cache miss — perform lightweight check
  try {
    const start = Date.now();

    // 1. JWT_SECRET integrity
    const secret = process.env['JWT_SECRET'];
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET missing or too short (min 32 chars)');
    }

    // 2. JwtService class methods loaded
    if (
      typeof JwtService.generateTokens !== 'function' ||
      typeof JwtService.verifyAccessToken !== 'function'
    ) {
      throw new Error('JwtService methods unavailable');
    }

    const latencyMs = Date.now() - start;
    authHealthCache = { ok: true, checkedAt: Date.now(), latencyMs };
    return { status: 'ok', latencyMs };
  } catch (err) {
    const error = (err as Error).message;
    authHealthCache = { ok: false, checkedAt: Date.now(), latencyMs: 0, error };
    return { status: 'fail', error };
  }
}

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: `${BRAND.name} API is live 🦷`,
    version: API_VERSION,
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/health', async (req, res) => {
  const start = Date.now();
  const checks: Record<
    string,
    { status: string; latencyMs?: number; error?: string; details?: unknown }
  > = {};

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    checks['database'] = { status: dbLatency > 1000 ? 'slow' : 'ok', latencyMs: dbLatency };
  } catch (err) {
    checks['database'] = { status: 'fail', error: (err as Error).message };
  }

  // Auth check (cached 60s — health probes hit every 5min from 4 sources)
  checks['auth'] = checkAuthHealth();

  if (env.UPSTASH_REDIS_REST_URL) {
    const redisResult = await verifyRedis();
    checks['redis'] = {
      status: redisResult.ok ? 'ok' : 'fail',
      latencyMs: redisResult.latencyMs,
      ...(redisResult.ok ? {} : { error: 'Redis ping failed' }),
    };
  } else {
    checks['redis'] = { status: 'warn', error: 'Not configured — using in-memory fallback' };
  }

  try {
    const aiHealth = getAIHealth();
    checks['ai'] = {
      status: 'ok',
      details: { providers: aiHealth.providers, dailyCost: aiHealth.dailyCosts },
    };
  } catch {
    checks['ai'] = { status: 'warn', error: 'AI health unavailable' };
  }

  checks['email'] = {
    status: env.RESEND_API_KEY ? 'ok' : 'warn',
    ...(env.RESEND_API_KEY ? {} : { error: 'RESEND_API_KEY not set' }),
  };
  checks['sms'] = {
    status: env.MSG91_AUTH_KEY ? 'ok' : 'warn',
    ...(env.MSG91_AUTH_KEY ? {} : { error: 'MSG91_AUTH_KEY not set' }),
  };

  if (env.WHATSAPP_ENABLED) {
    const waResult = await whatsappHealthCheck();
    checks['whatsapp'] = {
      status: waResult.ok ? 'ok' : 'fail',
      latencyMs: waResult.latencyMs,
      error: waResult.error,
    };
  }

  checks['sentry'] = {
    status: env.SENTRY_DSN ? 'ok' : 'warn',
    ...(env.SENTRY_DSN ? {} : { error: 'SENTRY_DSN not set' }),
  };

  const cfRay = req.headers['cf-ray'];
  checks['cloudflare'] = {
    status: cfRay ? 'ok' : 'warn',
    ...(cfRay ? { latencyMs: 0 } : { error: 'Request not proxied through Cloudflare' }),
  };

  const memUsage = process.memoryUsage();
  const criticalChecks = ['database', 'auth'];
  const allCriticalOk = criticalChecks.every((k) => checks[k]?.status === 'ok');

  res.status(allCriticalOk ? 200 : 503).json({
    status: allCriticalOk ? 'healthy' : 'degraded',
    version: API_VERSION,
    uptime: Math.floor(process.uptime()),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    },
    checks,
    totalMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  });
});

healthRouter.head('/health', (_req, res) => {
  res.status(200).end();
});

healthRouter.get('/report/:id', (req, res) => {
  res.redirect(`/api/consultations/${req.params['id']}/pdf`);
});
