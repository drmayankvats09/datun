// ═══════════════════════════════════════════════════════════════
// WHATSAPP PUBLISHER — Meta Cloud API
// ═══════════════════════════════════════════════════════════════
import type { Publisher } from '../outbox-relay';
import type { PublishResult, OutboxEventRecord } from '../outbox.types';

export const whatsappPublisher: Publisher = async (
  event: OutboxEventRecord,
): Promise<PublishResult> => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId)
    return { success: false, error: 'WhatsApp env missing', retryable: false };

  const payload = event.payload as {
    to: string;
    templateName: string;
    language?: string;
    components?: unknown[];
  };
  if (!payload.to || !payload.templateName) {
    return {
      success: false,
      error: 'invalid payload — to/templateName required',
      retryable: false,
    };
  }

  const body = {
    messaging_product: 'whatsapp',
    to: payload.to,
    type: 'template',
    template: {
      name: payload.templateName,
      language: { code: payload.language ?? 'en' },
      components: payload.components ?? [],
    },
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) return { success: true, publishedAt: new Date(), retryable: false };
    const errText = await res.text().catch(() => 'unknown');
    const retryable = res.status >= 500 || res.status === 429;
    return { success: false, error: `HTTP ${res.status}: ${errText}`, retryable };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      retryable: true,
    };
  }
};
