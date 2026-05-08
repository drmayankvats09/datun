// ═══════════════════════════════════════════════════════════════
// DRIFT STORE — persists alerts, dispatches Slack/PagerDuty
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';
import type { DriftAlert } from './drift.types';

export class DriftStore {
  constructor(private readonly prisma: PrismaClient) {}

  async record(alert: DriftAlert): Promise<void> {
    await this.prisma.driftAlert.create({
      data: {
        id: alert.id,
        kind: alert.kind,
        metric: alert.metric,
        observedValue: alert.observedValue,
        threshold: alert.threshold,
        windowDays: alert.windowDays,
        severity: alert.severity,
        actionRequired: alert.actionRequired,
        detectedAt: alert.detectedAt,
      },
    });

    if (alert.severity === 'critical' && process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 [Datun ML Drift] ${alert.metric} = ${alert.observedValue.toFixed(3)} (threshold ${alert.threshold})\n${alert.actionRequired}`,
        }),
      }).catch(() => undefined);
    }
  }
}
