/**
 * Migration Notifier — production migration event notifications.
 *
 * Channels (configurable via env, all optional):
 *   - Slack incoming webhook (SLACK_MIGRATION_WEBHOOK_URL)
 *   - Email via Resend (REND_API_KEY + ALERT_EMAIL)
 *   - Better Stack incident if migration fails (BETTERSTACK_TOKEN)
 *
 * The notifier never throws — notification failure is logged but never
 * blocks the migration outcome. This is by design: notifications are
 * an observability feature, not a correctness feature.
 *
 * @see docs/runbooks/migration-deploy.md
 */

import type { MigrationAuditEntry } from './migration-audit.js';

export interface NotifierConfig {
  slackWebhookUrl?: string;
  resendApiKey?: string;
  alertEmail?: string;
  betterStackToken?: string;
  /** Override for test injection. */
  fetchImpl?: typeof fetch;
}

/** Build the notifier from env. Returns a no-op notifier in dev/test. */
export function notifierFromEnv(): NotifierConfig {
  return {
    slackWebhookUrl: process.env.SLACK_MIGRATION_WEBHOOK_URL,
    resendApiKey: process.env.RESEND_API_KEY,
    alertEmail: process.env.ALERT_EMAIL,
    betterStackToken: process.env.BETTERSTACK_TOKEN,
  };
}

function formatSlackMessage(entry: MigrationAuditEntry): string {
  const icon = entry.success ? ':white_check_mark:' : ':rotating_light:';
  const status = entry.success ? 'applied' : 'FAILED';
  const lines = [
    `${icon} *Datun migration ${status}*`,
    `*Migration:* \`${entry.migrationName}\``,
    `*Duration:* ${entry.durationMs}ms`,
    `*Applied by:* ${entry.appliedBy}`,
    `*Host:* ${entry.appliedFrom}`,
    `*Postgres:* ${entry.postgresVersion}`,
    `*Prisma:* ${entry.prismaVersion}`,
  ];
  if (entry.gitCommitSha) {
    lines.push(`*Commit:* \`${entry.gitCommitSha.slice(0, 7)}\` on \`${entry.gitBranch ?? '?'}\``);
  }
  if (!entry.success && entry.errorMessage) {
    lines.push(`*Error:* \`\`\`${entry.errorMessage.slice(0, 1000)}\`\`\``);
  }
  return lines.join('\n');
}

async function sendSlack(webhookUrl: string, text: string, fetchImpl: typeof fetch): Promise<void> {
  const res = await fetchImpl(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook returned ${res.status}`);
  }
}

async function sendEmail(
  apiKey: string,
  to: string,
  entry: MigrationAuditEntry,
  fetchImpl: typeof fetch,
): Promise<void> {
  const status = entry.success ? 'applied' : 'FAILED';
  const subject = `[Datun] Migration ${status}: ${entry.migrationName}`;
  const html = `
    <h2>Datun Migration ${status}</h2>
    <table>
      <tr><td><b>Migration</b></td><td><code>${entry.migrationName}</code></td></tr>
      <tr><td><b>Duration</b></td><td>${entry.durationMs}ms</td></tr>
      <tr><td><b>Applied by</b></td><td>${entry.appliedBy}</td></tr>
      <tr><td><b>Host</b></td><td>${entry.appliedFrom}</td></tr>
      <tr><td><b>Postgres</b></td><td>${entry.postgresVersion}</td></tr>
      <tr><td><b>Prisma</b></td><td>${entry.prismaVersion}</td></tr>
      <tr><td><b>Commit</b></td><td><code>${entry.gitCommitSha ?? 'n/a'}</code></td></tr>
      <tr><td><b>Branch</b></td><td><code>${entry.gitBranch ?? 'n/a'}</code></td></tr>
      <tr><td><b>Schema checksum</b></td><td><code>${entry.schemaChecksum.slice(0, 16)}...</code></td></tr>
    </table>
    ${entry.errorMessage ? `<h3>Error</h3><pre>${entry.errorMessage}</pre>` : ''}
  `;
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Datun Migrations <noreply@datunai.com>',
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Resend returned ${res.status}: ${await res.text()}`);
  }
}

/**
 * Send notifications for a migration apply event.
 * All channels run in parallel; failures are logged but never propagate.
 *
 * Notifications are gated to "production-relevant" sources only —
 * local-dev applies are noisy and skipped.
 */
export async function notifyMigration(
  entry: MigrationAuditEntry,
  config: NotifierConfig = notifierFromEnv(),
): Promise<void> {
  // Skip noisy local dev events
  if (entry.appliedBy.startsWith('local-dev')) return;
  if (entry.appliedBy.startsWith('test')) return;

  const fetchImpl = config.fetchImpl ?? fetch;
  const tasks: Promise<unknown>[] = [];

  if (config.slackWebhookUrl) {
    tasks.push(sendSlack(config.slackWebhookUrl, formatSlackMessage(entry), fetchImpl));
  }
  if (config.resendApiKey && config.alertEmail) {
    tasks.push(sendEmail(config.resendApiKey, config.alertEmail, entry, fetchImpl));
  }
  // Better Stack incidents are opened only on failure
  if (!entry.success && config.betterStackToken) {
    tasks.push(
      fetchImpl('https://uptime.betterstack.com/api/v2/incidents', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.betterStackToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: `Migration failed: ${entry.migrationName}`,
          summary: entry.errorMessage ?? 'no error message',
          severity: 'error',
        }),
      }),
    );
  }

  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === 'rejected') {
      console.error('[migration-notifier] channel failed:', r.reason);
    }
  }
}
