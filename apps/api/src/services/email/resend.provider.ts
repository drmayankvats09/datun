// ═══════════════════════════════════════════════════════════════
// RESEND PROVIDER — Primary email provider
// Free: 3k emails/month. Paid: $20/mo for 50k.
// Already integrated for OTP + admin alerts.
// Pattern: ai/claude.provider.ts — same structure.
// ═══════════════════════════════════════════════════════════════

import { Resend } from 'resend';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { EmailProvider, EmailSendOptions, EmailSendResult } from './types.js';

export class ResendProvider implements EmailProvider {
  readonly name = 'resend';
  private client: Resend | null = null;

  isConfigured(): boolean {
    return !!env.RESEND_API_KEY;
  }

  private getClient(): Resend {
    if (!this.client) {
      this.client = new Resend(env.RESEND_API_KEY);
    }
    return this.client;
  }

  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        errorMessage: 'RESEND_API_KEY not configured',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      const client = this.getClient();
      const result = await client.emails.send({
        from: options.from ?? `Datun <noreply@${env.RESEND_FROM_DOMAIN}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        replyTo: options.replyTo,
        tags: options.tags,
      });

      // Resend returns { data: { id }, error: null } on success
      if (result.error) {
        return {
          success: false,
          provider: this.name,
          errorMessage: result.error.message,
          errorCode: result.error.name,
        };
      }

      return {
        success: true,
        provider: this.name,
        providerMessageId: result.data?.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('[Email][Resend] Send failed', {
        to: options.to,
        subject: options.subject,
        error: message,
      });
      return {
        success: false,
        provider: this.name,
        errorMessage: message,
        errorCode: 'SEND_FAILED',
      };
    }
  }

  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, latencyMs: 0, error: 'Not configured' };
    }

    const start = Date.now();
    try {
      // Resend doesn't have a dedicated health endpoint
      // List domains as a lightweight check (1 API call)
      const client = this.getClient();
      await client.domains.list();
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
