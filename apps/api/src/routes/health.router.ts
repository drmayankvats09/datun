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

  try {
    const authStart = Date.now();
    const testToken = JwtService.generateTokens({
      userId: 'health-check',
      email: 'health@datunai.com',
      role: 'PATIENT',
    });
    JwtService.verifyAccessToken(testToken.accessToken);
    checks['auth'] = { status: 'ok', latencyMs: Date.now() - authStart };
  } catch (err) {
    checks['auth'] = { status: 'fail', error: (err as Error).message };
  }

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
