// ═══════════════════════════════════════════════════════════════
// PDF PROCESSOR — Generates consultation reports
//
// Day 14 (Task #41): STUB. Logs and returns mock URL.
// Real PDF generation comes in Task #58 (PDF Prescription).
//
// Why stub now: contract locked. Future Task #58 just fills body.
// ═══════════════════════════════════════════════════════════════

import type { Job } from 'bullmq';
import { PDF_JOB_NAMES, type ConsultationPdfJob, type PdfJobName } from '@repo/shared';
import { logger } from '../lib/logger.js';

export async function processPdfJob(
  job: Job<ConsultationPdfJob, { pdfUrl: string }, PdfJobName>,
): Promise<{ pdfUrl: string }> {
  if (job.name === PDF_JOB_NAMES.CONSULTATION_REPORT) {
    const data = job.data;
    logger.info('[PDF Worker] STUB — generating consultation PDF', {
      jobId: job.id,
      consultationId: data.consultationId,
      userId: data.userId,
      locale: data.locale,
    });
    // Simulate work duration so we can verify metrics in dashboard
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Stub URL — Task #58 will replace with real Cloudinary URL
    return {
      pdfUrl: `https://stub.datunai.com/consultations/${data.consultationId}.pdf`,
    };
  }

  throw new Error(`Unknown PDF job name: ${String(job.name)}`);
}
