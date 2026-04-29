// ═══════════════════════════════════════════════════════════════
// META WHATSAPP PROVIDER — Cloud API v19.0 implementation
// Full response logging for debugging "sent but not delivered."
// Error categorization with actionable fix instructions.
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';
import { logger } from '../../lib/logger.js';
import type { WhatsAppProvider, WhatsAppSendResult, TemplateComponent } from './types.js';

const GRAPH_API = 'https://graph.facebook.com/v19.0';

// Meta error codes that indicate CRITICAL infrastructure issues
const CRITICAL_CODES = new Set([
  131056, // Payment method not verified
  131047, // Re-engagement window closed (24hr)
  131051, // Unsupported message type
  190, // Invalid/expired access token
  131000, // Generic undeliverable
  131005, // Generic undeliverable
  131031, // Business account locked
  368, // Temporarily blocked for policy violation
]);

export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'meta';
  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor(token: string, phoneNumberId: string) {
    this.token = token;
    this.phoneNumberId = phoneNumberId;
  }

  isConfigured(): boolean {
    return !!(this.token && this.phoneNumberId);
  }

  private get messagesUrl(): string {
    return `${GRAPH_API}/${this.phoneNumberId}/messages`;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async sendText(to: string, body: string): Promise<WhatsAppSendResult> {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    };

    return this.send(payload, `text→${to}`);
  }

  async sendTemplate(
    to: string,
    templateName: string,
    components: TemplateComponent[],
  ): Promise<WhatsAppSendResult> {
    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: components ?? [],
      },
    };

    return this.send(payload, `template:${templateName}→${to}`);
  }

  async healthCheck(): Promise<{
    ok: boolean;
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const res = await axios.get(`${GRAPH_API}/${this.phoneNumberId}`, {
        headers: this.headers,
        timeout: 10000,
      });
      return { ok: res.status === 200, latencyMs: Date.now() - start };
    } catch (err) {
      const msg = this.extractMetaError(err).message;
      return { ok: false, latencyMs: Date.now() - start, error: msg };
    }
  }

  // ── Private ──

  private async send(payload: Record<string, unknown>, label: string): Promise<WhatsAppSendResult> {
    try {
      const response = await axios.post(this.messagesUrl, payload, {
        headers: this.headers,
        timeout: 15000,
      });

      const messageId: string = response.data?.messages?.[0]?.id ?? 'unknown';
      const messageStatus: string = response.data?.messages?.[0]?.message_status ?? 'unknown';

      // Log FULL response for debugging "sent but not delivered"
      logger.info('WhatsApp sent', {
        provider: 'meta',
        label,
        messageId,
        messageStatus,
        httpStatus: response.status,
        // Log contacts info — shows if number is registered on WhatsApp
        contacts: response.data?.contacts,
      });

      return {
        success: true,
        providerMessageId: messageId,
        provider: 'meta',
        rawResponse: {
          messageId,
          messageStatus,
          contacts: response.data?.contacts,
        },
      };
    } catch (err) {
      const { code, message, details } = this.extractMetaError(err);
      const isCritical = CRITICAL_CODES.has(Number(code));

      logger.error('WhatsApp FAILED', {
        provider: 'meta',
        label,
        errorCode: code,
        errorMessage: message,
        errorDetails: details,
        isCritical,
        diagnosis: this.diagnoseError(code),
      });

      return {
        success: false,
        errorCode: code,
        errorMessage: message,
        provider: 'meta',
        rawResponse: details,
      };
    }
  }

  private extractMetaError(err: unknown): {
    code: string;
    message: string;
    details: unknown;
  } {
    const axErr = err as {
      response?: { data?: { error?: Record<string, unknown> } };
      message: string;
    };
    const metaError = axErr.response?.data?.error;
    return {
      code: String(metaError?.code ?? 'NETWORK'),
      message: String(metaError?.message ?? axErr.message),
      details: metaError ?? null,
    };
  }

  /** Human-readable diagnosis for common Meta error codes */
  private diagnoseError(code: string): string {
    const diagnoses: Record<string, string> = {
      '131056':
        'Payment method not verified in Meta Business. Go to business.facebook.com → Billing.',
      '131047': '24hr messaging window closed. Use approved template instead of text.',
      '131051': 'Unsupported message type for this recipient.',
      '190': 'Access token invalid/expired. Regenerate in Business Settings → System Users.',
      '131000': 'Message undeliverable. Number may not be on WhatsApp.',
      '131005': 'Message undeliverable. Check number format (91XXXXXXXXXX).',
      '131031': 'Business account locked by Meta. Check business.facebook.com for notices.',
      '368': 'Account temporarily blocked for policy violation. Wait or appeal.',
      NETWORK: 'Could not reach Meta API. Check internet/firewall.',
    };
    return diagnoses[code] ?? 'Unknown error code — check Meta docs.';
  }
}
