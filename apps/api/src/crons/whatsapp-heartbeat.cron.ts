// ═══════════════════════════════════════════════════════════════
// CRON: WhatsApp Multi-Provider Heartbeat (every 30 min)
// Checks all configured providers + persists health to DB.
// Alert tiers:
//   - INFO: Primary recovered after failures
//   - WARNING: Primary down BUT fallback healthy (degraded mode)
//   - CRITICAL: ALL providers down (true outage)
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@repo/db';
import { logger } from '../lib/logger.js';
import { pingHealthcheck } from '../lib/healthcheck.js';
import { alertAdmin } from '../services/alert.service.js';
import { whatsappHealthCheck } from '../services/whatsapp/index.js';
import { env } from '../config/env.js';

let consecutiveAllDown = 0;
let consecutivePrimaryDown = 0;

export async function runWhatsAppHeartbeat(): Promise<void> {
  if (!env.WHATSAPP_ENABLED) return;

  const result = await whatsappHealthCheck();

  // Persist per-provider health to DB
  for (const p of result.providers) {
    const providerEnum = p.name === 'meta' ? 'META' : p.name === 'gupshup' ? 'GUPSHUP' : 'AISENSY';
    try {
      await prisma.whatsAppProviderHealth.upsert({
        where: { provider: providerEnum },
        create: {
          provider: providerEnum,
          status: p.ok ? 'HEALTHY' : 'UNHEALTHY',
          lastHeartbeatAt: new Date(),
          lastHeartbeatLatencyMs: p.latencyMs,
          ...(p.error && { lastHeartbeatError: p.error }),
        },
        update: {
          status: p.ok ? 'HEALTHY' : 'UNHEALTHY',
          lastHeartbeatAt: new Date(),
          lastHeartbeatLatencyMs: p.latencyMs,
          ...(p.error ? { lastHeartbeatError: p.error } : { lastHeartbeatError: null }),
          ...(p.ok && { lastSuccessAt: new Date() }),
          ...(!p.ok && { lastFailureAt: new Date() }),
        },
      });
    } catch (err) {
      logger.error('[Heartbeat] DB upsert failed', {
        provider: p.name,
        error: (err as Error).message,
      });
    }
  }

  const primary = result.providers[0];
  const anyHealthy = result.providers.some((p) => p.ok);
  const allDown = result.providers.length > 0 && !anyHealthy;
  const primaryDown = primary && !primary.ok;

  // Alert tier 1 — All providers down (CRITICAL)
  if (allDown) {
    consecutiveAllDown++;
    consecutivePrimaryDown++;
    logger.error(`[Heartbeat] ALL WhatsApp providers DOWN (#${consecutiveAllDown})`, {
      providers: result.providers,
    });
    await pingHealthcheck(env.HEALTHCHECK_WHATSAPP_URL, true);

    if (consecutiveAllDown === 3) {
      const errors = result.providers.map((p) => `  ${p.name}: ${p.error ?? 'unknown'}`).join('\n');
      await alertAdmin(
        'CRITICAL',
        'ALL WhatsApp Providers DOWN',
        `3 consecutive failures across all providers.\n\nErrors:\n${errors}\n\nCheck:\n- business.facebook.com\n- gupshup.io dashboard\n- status.fb.com`,
        { alertKey: 'whatsapp_all_down', cooldownMin: 60 },
      );
    }
    return;
  }

  // Alert tier 2 — Primary down but fallback healthy (WARNING)
  if (primaryDown && anyHealthy) {
    consecutivePrimaryDown++;
    logger.warn(`[Heartbeat] Primary (${primary?.name}) DOWN, fallback active`, {
      providers: result.providers,
    });

    if (consecutivePrimaryDown === 3) {
      await alertAdmin(
        'WARNING',
        `WhatsApp Primary (${primary?.name}) Down — Fallback Active`,
        `Primary provider failing 3+ times. Fallback chain still healthy.\nPrimary error: ${primary?.error}\n\nMonitor: this is degraded mode, not outage.`,
        { alertKey: 'whatsapp_primary_down', cooldownMin: 30 },
      );
    }
    return;
  }

  // All healthy — recovery alert if was previously down
  if (consecutivePrimaryDown >= 3 || consecutiveAllDown >= 3) {
    await alertAdmin(
      'INFO',
      'WhatsApp Recovered',
      `All providers healthy again after outage.\nLatency: ${result.latencyMs}ms`,
      { alertKey: 'whatsapp_recovery', cooldownMin: 5 },
    );
  }

  consecutiveAllDown = 0;
  consecutivePrimaryDown = 0;
  logger.info(`[Heartbeat] WhatsApp ok | ${result.latencyMs}ms`, {
    providers: result.providers.map((p) => `${p.name}:${p.ok ? 'OK' : 'FAIL'}`).join(', '),
  });
  await pingHealthcheck(env.HEALTHCHECK_WHATSAPP_URL);
}
