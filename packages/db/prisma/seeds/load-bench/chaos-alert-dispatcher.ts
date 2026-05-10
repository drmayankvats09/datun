// ═══════════════════════════════════════════════════════════════
// CHAOS ALERT DISPATCHER — fan-out chaos suite failures
// Sources: PagerDuty Events API v2 + Slack incoming webhooks
// ═══════════════════════════════════════════════════════════════
import type { ChaosResult } from './chaos-injector';

export interface AlertContext {
  runId: string;
  environment: 'test' | 'staging' | 'production';
  triggeredBy: string;
}

export async function dispatchChaosFailure(
  results: readonly ChaosResult[],
  ctx: AlertContext,
): Promise<void> {
  const failed = results.filter((r) => r.status === 'crashed');
  if (failed.length === 0) return;

  const summary = failed.map((f) => `${f.fault.kind}: ${f.observedBehaviour}`).join(' | ');

  // Slack
  if (process.env.SLACK_WEBHOOK_URL) {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 *Datun seed chaos suite FAILED* (${failed.length}/${results.length})`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '🚨 Chaos suite failure' } },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Run ID:*\n${ctx.runId}` },
              { type: 'mrkdwn', text: `*Env:*\n${ctx.environment}` },
              { type: 'mrkdwn', text: `*Triggered by:*\n${ctx.triggeredBy}` },
              { type: 'mrkdwn', text: `*Failed faults:*\n${failed.length}/${results.length}` },
            ],
          },
          { type: 'section', text: { type: 'mrkdwn', text: `\`\`\`${summary}\`\`\`` } },
        ],
      }),
    }).catch((e) => console.error('Slack dispatch failed:', e));
  }

  // PagerDuty (Events API v2)
  if (process.env.PAGERDUTY_ROUTING_KEY) {
    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: process.env.PAGERDUTY_ROUTING_KEY,
        event_action: 'trigger',
        dedup_key: `datun-chaos-${ctx.runId}`,
        payload: {
          summary: `Datun seed chaos suite failed: ${failed.length}/${results.length}`,
          severity: 'error',
          source: 'datun-seed-chaos',
          custom_details: { runId: ctx.runId, environment: ctx.environment, failedFaults: failed },
        },
      }),
    }).catch((e) => console.error('PagerDuty dispatch failed:', e));
  }
}
