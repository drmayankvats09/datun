// ═══════════════════════════════════════════════════════════════
// CONSULTATION ROUTES — /api/consultations/*
// Lifecycle: start → message → message → ... → complete → PDF
// TODO: Implement all handlers in Task #24+
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { consultationStartSchema, consultationMessageSchema } from '../validators/schemas.js';

export const consultationRouter = Router();

// POST /api/consultations/start — Create new consultation
consultationRouter.post(
  '/consultations/start',
  requireUser,
  validate(consultationStartSchema),
  async (_req, res) => {
    // TODO: Create Consultation + ConsultationMessage rows via Prisma
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Pending implementation' },
    });
  },
);

// PATCH /api/consultations/:id/message — Incremental save (each message turn)
consultationRouter.patch(
  '/consultations/:id/message',
  requireUser,
  validate(consultationMessageSchema),
  async (_req, res) => {
    // TODO: Append to ConsultationMessage, update Consultation.totalMessages
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Pending implementation' },
    });
  },
);

// POST /api/consultations/:id/complete — Finalize consultation
consultationRouter.post('/consultations/:id/complete', requireUser, async (_req, res) => {
  // TODO: Set status=COMPLETED, generate PDF, send WhatsApp notifications
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Pending implementation' },
  });
});

// GET /api/consultations/:id/pdf — Download PDF report
consultationRouter.get('/consultations/:id/pdf', async (_req, res) => {
  // TODO: Fetch consultation, generate PDF via pdf.service, stream response
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Pending implementation' },
  });
});

// POST /api/save-consultation — Legacy save endpoint (backward compat)
consultationRouter.post('/save-consultation', async (_req, res) => {
  // TODO: Full save with WhatsApp internal alerts + patient template
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Pending implementation' },
  });
});
