// ═══════════════════════════════════════════════════════════════
// HEALTH ROUTES — System status + diagnostics
// These are PUBLIC — no auth required.
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { prisma } from '@repo/db';
import { BRAND, API_VERSION } from '@repo/shared';
import { env } from '../config/env.js';
import { whatsappHealthCheck } from '../services/whatsapp/index.js';

export const healthRouter = Router();

// Root — basic liveness
healthRouter.get('/', (_req, res) => {
  res.json({
    status: `${BRAND.name} API is live 🦷`,
    version: API_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// Deep health — checks every dependency
healthRouter.get('/health', async (_req, res) => {
  const start = Date.now();
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Database
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks['database'] = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err) {
    checks['database'] = { status: 'fail', error: (err as Error).message };
  }

  // WhatsApp (if enabled)
  if (env.WHATSAPP_ENABLED) {
    const waResult = await whatsappHealthCheck();
    checks['whatsapp'] = {
      status: waResult.ok ? 'ok' : 'fail',
      latencyMs: waResult.latencyMs,
      error: waResult.error,
    };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const totalMs = Date.now() - start;

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    version: API_VERSION,
    uptime: Math.floor(process.uptime()),
    checks,
    totalMs,
    timestamp: new Date().toISOString(),
  });
});

// PDF short URL redirect
healthRouter.get('/report/:id', (req, res) => {
  res.redirect(`/api/consultations/${req.params['id']}/pdf`);
});
