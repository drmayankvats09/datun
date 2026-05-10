// ═══════════════════════════════════════════════════════════════
// ALERT HOOKS — Slack + email + WhatsApp on critical seed failures
// ═══════════════════════════════════════════════════════════════

import type { OrchestratorRunResult } from '../modules/runtime/saga-orchestrator';

export interface AlertChannel {
  readonly name: string;
  send(subject: string, body: string): Promise<void>;
}

export class SlackAlertChannel implements AlertChannel {
  readonly name = 'slack';
  constructor(private readonly webhookUrl: string) {}
  async send(subject: string, body: string): Promise<void> {
    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `*${subject}*\n\`\`\`${body}\`\`\`` }),
      });
    } catch {
      // Silent fail — never crash seed because of alert delivery
    }
  }
}

export class ResendAlertChannel implements AlertChannel {
  readonly name = 'email-resend';
  constructor(
    private readonly apiKey: string,
    private readonly toEmail: string,
    private readonly fromEmail: string,
  ) {}
  async send(subject: string, body: string): Promise<void> {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          from: this.fromEmail,
          to: this.toEmail,
          subject,
          html: `<pre>${body}</pre>`,
        }),
      });
    } catch {
      /* silent */
    }
  }
}

export class AlertDispatcher {
  constructor(private readonly channels: readonly AlertChannel[]) {}

  async dispatchOnFailure(result: OrchestratorRunResult): Promise<void> {
    if (result.status === 'COMPLETED') return;
    const subject = `[Datun Seed] ${result.status} — ${result.failedCount} failed`;
    const body = [
      `Run ID: ${result.runId}`,
      `Status: ${result.status}`,
      `Completed: ${result.completedCount}/${result.totalModules}`,
      `Failed: ${result.failedCount}`,
      `Records: ${result.totalRecordsCreated}`,
      `Duration: ${(result.totalDurationMs / 1000).toFixed(1)}s`,
      ``,
      `Failed modules:`,
      ...result.results
        .filter((r) => r.status === 'FAILED')
        .map((r) => `- ${r.moduleName}: ${r.error?.message ?? 'unknown'}`),
    ].join('\n');

    await Promise.all(this.channels.map((c) => c.send(subject, body)));
  }
}

export function buildDefaultDispatcher(): AlertDispatcher {
  const channels: AlertChannel[] = [];
  if (process.env.SLACK_WEBHOOK_URL)
    channels.push(new SlackAlertChannel(process.env.SLACK_WEBHOOK_URL));
  if (process.env.RESEND_API_KEY && process.env.ALERT_TO_EMAIL && process.env.ALERT_FROM_EMAIL) {
    channels.push(
      new ResendAlertChannel(
        process.env.RESEND_API_KEY,
        process.env.ALERT_TO_EMAIL,
        process.env.ALERT_FROM_EMAIL,
      ),
    );
  }
  return new AlertDispatcher(channels);
}
