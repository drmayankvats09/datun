// ═══════════════════════════════════════════════════════════════
// EMAIL PUBLISHER — Resend
// ═══════════════════════════════════════════════════════════════
import type { Publisher } from '../outbox-relay';
import type { PublishResult, OutboxEventRecord } from '../outbox.types';

export const emailPublisher: Publisher = async (
  event: OutboxEventRecord,
): Promise<PublishResult> => {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { success: false, error: 'RESEND_API_KEY missing', retryable: false };

  const payload = event.payload as {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    from?: string;
  };
  if (!payload.to || !payload.subject)
    return { success: false, error: 'invalid payload', retryable: false };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: payload.from ?? 'Datun <noreply@datunai.com>',
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });
    if (res.ok) return { success: true, publishedAt: new Date(), retryable: false };
    const errText = await res.text().catch(() => 'unknown');
    return {
      success: false,
      error: `HTTP ${res.status}: ${errText}`,
      retryable: res.status >= 500 || res.status === 429,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      retryable: true,
    };
  }
};
