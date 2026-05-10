// ═══════════════════════════════════════════════════════════════
// ANOMALY STORE — persists detected anomalies, triggers Slack/PagerDuty
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';
import type { Anomaly } from './anomaly.types';

export class AnomalyStore {
  constructor(private readonly prisma: PrismaClient) {}

  async record(anomaly: Anomaly): Promise<void> {
    await this.prisma.dataQualityAnomaly.create({
      data: {
        id: anomaly.id,
        kind: anomaly.kind,
        tableName: anomaly.tableName,
        columnName: anomaly.columnName,
        observedValue: anomaly.observedValue,
        expectedMin: anomaly.expectedRange.min,
        expectedMax: anomaly.expectedRange.max,
        zScore: anomaly.zScore ?? null,
        severity: anomaly.severity,
        message: anomaly.message,
        detectedAt: anomaly.detectedAt,
      },
    });

    if (anomaly.severity === 'critical' && process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 [Datun DQ] ${anomaly.tableName}.${anomaly.columnName}: ${anomaly.message}`,
        }),
      }).catch(() => undefined);
    }

    if (anomaly.severity === 'critical' && process.env.PAGERDUTY_INTEGRATION_KEY) {
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
          event_action: 'trigger',
          payload: {
            summary: `[Datun DQ] ${anomaly.message}`,
            severity: 'error',
            source: 'datun-data-quality',
          },
        }),
      }).catch(() => undefined);
    }
  }
}
