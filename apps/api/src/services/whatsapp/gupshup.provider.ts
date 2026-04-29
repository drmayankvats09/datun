// ═══════════════════════════════════════════════════════════════
// GUPSHUP PROVIDER — Indian WhatsApp BSP (Backup Service Provider)
//
// Gupshup API: https://api.gupshup.io/sm/api/v1/msg
// Auth: apikey header
// Pricing: ~₹0.07/conversation (negotiated rates available)
// Activation: set GUPSHUP_API_KEY + GUPSHUP_APP_NAME +
//             GUPSHUP_SOURCE_NUMBER in env. Server restart auto-detects.
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { WhatsAppProvider, WhatsAppSendResult, TemplateComponent } from './types.js';

const GUPSHUP_API = 'https://api.gupshup.io/sm/api/v1';
const GUPSHUP_TEMPLATE_API = 'https://api.gupshup.io/wa/api/v1/template/msg';

export class GupshupProvider implements WhatsAppProvider {
  readonly name = 'gupshup' as const;

  isConfigured(): boolean {
    return !!(env.GUPSHUP_API_KEY && env.GUPSHUP_APP_NAME && env.GUPSHUP_SOURCE_NUMBER);
  }

  private get headers(): Record<string, string> {
    return {
      apikey: env.GUPSHUP_API_KEY ?? '',
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  async sendText(to: string, body: string): Promise<WhatsAppSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        errorMessage: 'Gupshup credentials not configured',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      const params = new URLSearchParams({
        channel: 'whatsapp',
        source: env.GUPSHUP_SOURCE_NUMBER ?? '',
        destination: to,
        message: JSON.stringify({ type: 'text', text: body }),
        'src.name': env.GUPSHUP_APP_NAME ?? '',
      });

      const response = await axios.post(`${GUPSHUP_API}/msg`, params.toString(), {
        headers: this.headers,
        timeout: 15_000,
      });

      const messageId: string = response.data?.messageId ?? response.data?.id ?? 'unknown';

      logger.info('[Gupshup] Text sent', {
        provider: 'gupshup',
        to,
        messageId,
        status: response.data?.status,
      });

      return {
        success: true,
        provider: this.name,
        providerMessageId: messageId,
        rawResponse: response.data,
      };
    } catch (err) {
      return this.handleError(err, `text→${to}`);
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    components: TemplateComponent[],
  ): Promise<WhatsAppSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        errorMessage: 'Gupshup credentials not configured',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      // Gupshup template format: extract body params from components
      const bodyComponent = components.find((c) => c.type === 'body');
      const bodyParams = bodyComponent?.parameters.map((p) => p.text) ?? [];

      const params = new URLSearchParams({
        channel: 'whatsapp',
        source: env.GUPSHUP_SOURCE_NUMBER ?? '',
        destination: to,
        'src.name': env.GUPSHUP_APP_NAME ?? '',
        template: JSON.stringify({
          id: templateName,
          params: bodyParams,
        }),
      });

      const response = await axios.post(GUPSHUP_TEMPLATE_API, params.toString(), {
        headers: this.headers,
        timeout: 15_000,
      });

      const messageId: string = response.data?.messageId ?? response.data?.id ?? 'unknown';

      logger.info('[Gupshup] Template sent', {
        provider: 'gupshup',
        to,
        templateName,
        messageId,
      });

      return {
        success: true,
        provider: this.name,
        providerMessageId: messageId,
        rawResponse: response.data,
      };
    } catch (err) {
      return this.handleError(err, `template:${templateName}→${to}`);
    }
  }

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, latencyMs: 0, error: 'Not configured' };
    }

    const start = Date.now();
    try {
      // Gupshup app status endpoint — lightweight check
      const response = await axios.get(`${GUPSHUP_API}/users/${env.GUPSHUP_SOURCE_NUMBER}`, {
        headers: this.headers,
        timeout: 10_000,
      });
      return { ok: response.status === 200, latencyMs: Date.now() - start };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, latencyMs: Date.now() - start, error: message };
    }
  }

  private handleError(err: unknown, label: string): WhatsAppSendResult {
    const axErr = err as {
      response?: { status?: number; data?: { message?: string; status?: string } };
      message: string;
    };
    const status = axErr.response?.status;
    const message = axErr.response?.data?.message ?? axErr.message;
    const errorCode = String(status ?? 'NETWORK');

    logger.error('[Gupshup] FAILED', {
      provider: 'gupshup',
      label,
      status,
      message,
      data: axErr.response?.data,
    });

    return {
      success: false,
      provider: this.name,
      errorCode,
      errorMessage: message,
      rawResponse: axErr.response?.data,
    };
  }
}
