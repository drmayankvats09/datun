// ═══════════════════════════════════════════════════════════════
// HEALTH ROUTES — System status + diagnostics
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { prisma } from '@repo/db';
import { BRAND, API_VERSION } from '@repo/shared';
import { env } from '../config/env.js';
import { whatsappHealthCheck } from '../services/whatsapp/index.js';
import { JwtService } from '../services/auth/jwt.service.js';
import { verifyRedis, isRedisHealthy } from '../lib/redis.js';

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
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Database check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks['database'] = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks['database'] = { status: 'fail', error: (err as Error).message };
  }

  // Auth check
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

  // Redis check
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

  // Email check
  checks['email'] = {
    status: env.RESEND_API_KEY ? 'ok' : 'warn',
    ...(env.RESEND_API_KEY ? {} : { error: 'RESEND_API_KEY not set' }),
  };

  // SMS check
  checks['sms'] = {
    status: env.MSG91_AUTH_KEY ? 'ok' : 'warn',
    ...(env.MSG91_AUTH_KEY ? {} : { error: 'MSG91_AUTH_KEY not set' }),
  };

  // WhatsApp check
  if (env.WHATSAPP_ENABLED) {
    const waResult = await whatsappHealthCheck();
    checks['whatsapp'] = {
      status: waResult.ok ? 'ok' : 'fail',
      latencyMs: waResult.latencyMs,
      error: waResult.error,
    };
  }

  // Cloudflare proxy check — verify requests come through CF
  const cfRay = req.headers['cf-ray'];
  checks['cloudflare'] = {
    status: cfRay ? 'ok' : 'warn',
    ...(cfRay ? { latencyMs: 0 } : { error: 'Request not proxied through Cloudflare' }),
  };

  const criticalChecks = ['database', 'auth'];
  const allCriticalOk = criticalChecks.every((k) => checks[k]?.status === 'ok');
  const totalMs = Date.now() - start;

  res.status(allCriticalOk ? 200 : 503).json({
    status: allCriticalOk ? 'healthy' : 'degraded',
    version: API_VERSION,
    uptime: Math.floor(process.uptime()),
    checks,
    totalMs,
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get('/report/:id', (req, res) => {
  res.redirect(`/api/consultations/${req.params['id']}/pdf`);
});
