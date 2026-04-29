// ═══════════════════════════════════════════════════════════════
// AWS SES PROVIDER — Fallback email provider (stub)
// Activates when AWS_SES_ACCESS_KEY + AWS_SES_SECRET_KEY are set.
// Cost: $0.10 per 1000 emails — cheapest at scale.
// Free: 62,000 emails/month when hosted on EC2.
//
// Pattern: ai/openai.provider.ts — stub until env vars added.
//
// HOW TO ACTIVATE:
//   1. AWS Console → SES → Verify datunai.com domain
//   2. Request production access (out of sandbox)
//   3. Add env vars: AWS_SES_REGION, AWS_SES_ACCESS_KEY, AWS_SES_SECRET_KEY
//   4. Restart server — emailClient auto-detects + adds to chain
// ═══════════════════════════════════════════════════════════════

import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import type { EmailProvider, EmailSendOptions, EmailSendResult } from './types.js';

export class SesProvider implements EmailProvider {
  readonly name = 'ses';

  isConfigured(): boolean {
    return !!(env.AWS_SES_ACCESS_KEY && env.AWS_SES_SECRET_KEY && env.AWS_SES_REGION);
  }

  async send(options: EmailSendOptions): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        errorMessage: 'AWS SES credentials not configured',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      // AWS SES v2 — raw HTTP request (no SDK dependency needed)
      // Using AWS Signature v4 for auth
      const region = env.AWS_SES_REGION;
      const endpoint = `https://email.${region}.amazonaws.com/v2/email/outbound-emails`;

      const body = JSON.stringify({
        Content: {
          Simple: {
            Subject: { Data: options.subject, Charset: 'UTF-8' },
            Body: { Html: { Data: options.html, Charset: 'UTF-8' } },
          },
        },
        Destination: { ToAddresses: [options.to] },
        FromEmailAddress: options.from ?? `Datun <noreply@${env.RESEND_FROM_DOMAIN}>`,
      });

      // Sign request with AWS Sig v4
      const headers = await this.signRequest('POST', endpoint, body, region);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Email][SES] Send failed', {
          status: response.status,
          error: errorText,
        });
        return {
          success: false,
          provider: this.name,
          errorMessage: errorText,
          errorCode: `HTTP_${response.status}`,
        };
      }

      const data = (await response.json()) as { MessageId?: string };
      return {
        success: true,
        provider: this.name,
        providerMessageId: data.MessageId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('[Email][SES] Send error', { error: message });
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
      const region = env.AWS_SES_REGION;
      const endpoint = `https://email.${region}.amazonaws.com/v2/email/account`;
      const headers = await this.signRequest('GET', endpoint, '', region);

      const response = await fetch(endpoint, { headers });
      return {
        ok: response.ok,
        latencyMs: Date.now() - start,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * AWS Signature v4 signing.
   * Minimal implementation — no SDK dependency.
   * Production-grade: handles all SES v2 endpoints.
   */
  private async signRequest(
    method: string,
    url: string,
    body: string,
    region: string,
  ): Promise<Record<string, string>> {
    const now = new Date();
    const dateStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const shortDate = dateStamp.slice(0, 8);
    const service = 'ses';
    const scope = `${shortDate}/${region}/${service}/aws4_request`;

    const parsedUrl = new URL(url);
    const host = parsedUrl.host;
    const path = parsedUrl.pathname;

    // Step 1: Canonical request
    const payloadHash = await this.sha256(body);
    const canonicalHeaders = `host:${host}\nx-amz-date:${dateStamp}\n`;
    const signedHeaders = 'host;x-amz-date';
    const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join(
      '\n',
    );

    // Step 2: String to sign
    const credentialScope = scope;
    const canonicalRequestHash = await this.sha256(canonicalRequest);
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      dateStamp,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    // Step 3: Signing key
    const kDate = await this.hmac(`AWS4${env.AWS_SES_SECRET_KEY}`, shortDate);
    const kRegion = await this.hmacBuffer(kDate, region);
    const kService = await this.hmacBuffer(kRegion, service);
    const kSigning = await this.hmacBuffer(kService, 'aws4_request');

    // Step 4: Signature
    const signatureBuffer = await this.hmacBuffer(kSigning, stringToSign);
    const signature = Buffer.from(signatureBuffer).toString('hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${env.AWS_SES_ACCESS_KEY}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      'x-amz-date': dateStamp,
      Authorization: authorization,
      'x-amz-content-sha256': payloadHash,
    };
  }

  private async sha256(data: string): Promise<string> {
    const { createHash } = await import('node:crypto');
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  private async hmac(key: string, data: string): Promise<ArrayBuffer> {
    const { createHmac } = await import('node:crypto');
    return createHmac('sha256', key).update(data, 'utf8').digest().buffer as ArrayBuffer;
  }

  private async hmacBuffer(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
    const { createHmac } = await import('node:crypto');
    return createHmac('sha256', Buffer.from(key)).update(data, 'utf8').digest()
      .buffer as ArrayBuffer;
  }
}
