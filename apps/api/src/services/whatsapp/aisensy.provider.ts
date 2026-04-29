// ═══════════════════════════════════════════════════════════════
// AISENSY PROVIDER — Emergency tier (Year 2 activation)
//
// AiSensy API: https://backend.aisensy.com/campaign/t1/api/v2
// Auth: x-api-key header
// Stub mode: returns NOT_CONFIGURED until AISENSY_API_KEY is set.
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { WhatsAppProvider, WhatsAppSendResult, TemplateComponent } from './types.js';

const AISENSY_API = 'https://backend.aisensy.com/campaign/t1/api/v2';

export class AiSensyProvider implements WhatsAppProvider {
  readonly name = 'aisensy' as const;

  isConfigured(): boolean {
    return !!env.AISENSY_API_KEY;
  }

  async sendText(_to: string, _body: string): Promise<WhatsAppSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        errorMessage: 'AiSensy not configured (Year 2 activation)',
        errorCode: 'NOT_CONFIGURED',
      };
    }
    // AiSensy primarily supports template messages — text is rare
    return {
      success: false,
      provider: this.name,
      errorMessage: 'AiSensy text messages not supported — use template',
      errorCode: 'UNSUPPORTED',
    };
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
        errorMessage: 'AiSensy not configured (Year 2 activation)',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      const bodyComponent = components.find((c) => c.type === 'body');
      const bodyParams = bodyComponent?.parameters.map((p) => p.text) ?? [];

      const response = await axios.post(
        AISENSY_API,
        {
          apiKey: env.AISENSY_API_KEY,
          campaignName: templateName,
          destination: to,
          userName: 'Datun System',
          templateParams: bodyParams,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15_000,
        },
      );

      const messageId: string = response.data?.messageId ?? 'unknown';

      logger.info('[AiSensy] Template sent', {
        provider: 'aisensy',
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
      const message = err instanceof Error ? err.message : String(err);
      logger.error('[AiSensy] FAILED', { provider: 'aisensy', to, templateName, error: message });
      return {
        success: false,
        provider: this.name,
        errorCode: 'SEND_FAILED',
        errorMessage: message,
      };
    }
  }

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, latencyMs: 0, error: 'Not configured' };
    }
    // AiSensy doesn't have a dedicated health endpoint — assume OK if configured
    return { ok: true, latencyMs: 0 };
  }
}
