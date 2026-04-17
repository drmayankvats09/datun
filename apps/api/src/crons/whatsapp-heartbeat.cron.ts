// ═══════════════════════════════════════════════════════════════
// CRON: WhatsApp API Heartbeat (every 30 min)
// ═══════════════════════════════════════════════════════════════

import { logger } from '../lib/logger.js';
import { pingHealthcheck } from '../lib/healthcheck.js';
import { alertAdmin } from '../services/alert.service.js';
import { whatsappHealthCheck } from '../services/whatsapp/index.js';
import { env } from '../config/env.js';

let consecutiveFailures = 0;

export async function runWhatsAppHeartbeat(): Promise<void> {
  if (!env.WHATSAPP_ENABLED) return;

  const result = await whatsappHealthCheck();

  if (result.ok) {
    if (consecutiveFailures >= 3) {
      await alertAdmin(
        'INFO',
        'WhatsApp API Recovered',
        `Healthy again after ${consecutiveFailures} failures. Latency: ${result.latencyMs}ms`,
        { alertKey: 'whatsapp_recovery', cooldownMin: 5 },
      );
    }
    consecutiveFailures = 0;
    logger.info(`[Heartbeat] WhatsApp ok | ${result.latencyMs}ms`);
    await pingHealthcheck(env.HEALTHCHECK_WHATSAPP_URL);
  } else {
    consecutiveFailures++;
    logger.error(`[Heartbeat] WhatsApp fail #${consecutiveFailures}: ${result.error}`);
    await pingHealthcheck(env.HEALTHCHECK_WHATSAPP_URL, true);

    if (consecutiveFailures === 3) {
      await alertAdmin(
        'CRITICAL',
        'WhatsApp Cloud API Down',
        `3 consecutive failures.\nError: ${result.error}\n\nCheck business.facebook.com and status.fb.com`,
        { alertKey: 'whatsapp_down', cooldownMin: 60 },
      );
    }
  }
}
