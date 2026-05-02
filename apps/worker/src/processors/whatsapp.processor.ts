// ═══════════════════════════════════════════════════════════════
// WHATSAPP PROCESSOR — Handles whatsapp queue jobs
//
// Worker calls into the same multi-provider WhatsApp client used by API.
// We don't reimplement Meta+Gupshup+AiSensy chain here — we reuse it.
// (Worker bundles @repo/db, but services/whatsapp lives in API package.)
//
// Strategy: copy the minimum needed (Meta send) into worker for Day 1.
// Future: extract whatsapp client to @repo/integrations package (Task #57+).
// ═══════════════════════════════════════════════════════════════

import type { Job } from 'bullmq';
import axios from 'axios';
import {
  WHATSAPP_JOB_NAMES,
  type WhatsAppTemplateJob,
  type WhatsAppTextJob,
  type WhatsAppJobName,
} from '@repo/shared';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const META_BASE = 'https://graph.facebook.com/v22.0';

type Payload = WhatsAppTemplateJob | WhatsAppTextJob;

export async function processWhatsAppJob(
  job: Job<Payload, { providerMessageId?: string }, WhatsAppJobName>,
): Promise<{ providerMessageId?: string }> {
  if (!env.WHATSAPP_ENABLED || !env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    logger.warn('[WA Worker] disabled — skipping job', { jobId: job.id });
    return {};
  }

  const url = `${META_BASE}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const headers = {
    Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json',
  };

  if (job.name === WHATSAPP_JOB_NAMES.SEND_TEMPLATE) {
    const data = job.data as WhatsAppTemplateJob;
    const body = {
      messaging_product: 'whatsapp',
      to: data.phone,
      type: 'template',
      template: {
        name: data.templateName,
        language: { code: 'en' },
        ...(data.components ? { components: data.components } : {}),
      },
    };

    try {
      const res = await axios.post<{ messages: Array<{ id: string }> }>(url, body, {
        headers,
        timeout: 30_000,
      });
      const providerMessageId = res.data.messages?.[0]?.id;
      logger.info('[WA Worker] template sent', {
        jobId: job.id,
        template: data.templateName,
        providerMessageId,
      });
      return { providerMessageId };
    } catch (err) {
      const e = err as Error & { response?: { data?: unknown; status?: number } };
      logger.error('[WA Worker] template send failed', {
        jobId: job.id,
        error: e.message,
        status: e.response?.status,
        responseData: e.response?.data,
      });
      throw e;
    }
  }

  if (job.name === WHATSAPP_JOB_NAMES.SEND_TEXT) {
    const data = job.data as WhatsAppTextJob;
    const body = {
      messaging_product: 'whatsapp',
      to: data.phone,
      type: 'text',
      text: { body: data.body },
    };

    try {
      const res = await axios.post<{ messages: Array<{ id: string }> }>(url, body, {
        headers,
        timeout: 30_000,
      });
      return { providerMessageId: res.data.messages?.[0]?.id };
    } catch (err) {
      logger.error('[WA Worker] text send failed', {
        jobId: job.id,
        error: (err as Error).message,
      });
      throw err;
    }
  }

  throw new Error(`Unknown WhatsApp job name: ${String(job.name)}`);
}
