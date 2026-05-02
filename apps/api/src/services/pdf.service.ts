// ═══════════════════════════════════════════════════════════════
// PDF SERVICE — Consultation report generation
// Day 14 (Task #41): Producer side wired. Worker has stub processor.
// Real PDF rendering logic comes in Task #58 (PDF Prescription).
// ═══════════════════════════════════════════════════════════════

import { enqueueConsultationPdf } from '../lib/queue/index.js';
import { logger } from '../lib/logger.js';

/**
 * Request PDF generation for a completed consultation.
 * Returns immediately with jobId — actual generation happens in worker.
 *
 * Caller pattern (from chat router or consultation completion):
 *   await requestConsultationPdf({ consultationId, userId, locale });
 *   // → returns 200 OK to user immediately
 *   // → worker generates PDF, uploads to Cloudinary, updates DB
 *   // → user notified via WhatsApp/email when ready
 */
export async function requestConsultationPdf(args: {
  consultationId: string;
  userId: string;
  locale?: string;
}): Promise<{ ok: boolean; jobId?: string }> {
  const result = await enqueueConsultationPdf({
    consultationId: args.consultationId,
    userId: args.userId,
    locale: args.locale ?? 'en',
  });

  if (!result.ok) {
    logger.warn('[PDF] enqueue failed', {
      consultationId: args.consultationId,
      reason: result.reason,
    });
  }

  return { ok: result.ok, jobId: result.jobId };
}
