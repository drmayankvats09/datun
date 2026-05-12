// ═══════════════════════════════════════════════════════════════
// CONSULTATION ROUTES — /api/consultations/*
// Lifecycle: start → message → message → ... → complete → PDF
// Task #44 Phase 2 — captureMessage wired into all turn writes.
// ═══════════════════════════════════════════════════════════════

import { Router, type Request, type Response, type NextFunction } from 'express';
import { prisma, Prisma } from '@repo/db';
import { requireUser } from '../middleware/auth.js';
import { validate, validateParams } from '../middleware/validate.js';
import { consultationStartSchema, consultationMessageSchema } from '../validators/schemas.js';
import { captureMessage } from '../services/training/index.js';
import { NotFoundError, ForbiddenError } from '../errors/index.js';
import { z } from 'zod';

export const consultationRouter = Router();

const consultationIdParamSchema = z.object({ id: z.string().uuid() });

// ─── POST /api/consultations/start ─────────────────────────────

consultationRouter.post(
  '/consultations/start',
  requireUser,
  validate(consultationStartSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth!.sub;
      const body = req.body as {
        patientId: string;
        language?: 'hi' | 'en';
        chiefComplaint?: string;
      };

      const consultation = await prisma.consultation.create({
        data: {
          patientId: body.patientId,
          initiatedByUserId: userId,
          userId,
          language: body.language ?? 'en',
          chiefComplaint: body.chiefComplaint ?? null,
          status: 'IN_PROGRESS',
        },
        select: { id: true, status: true, language: true, createdAt: true },
      });

      // Capture initial system message if a chief complaint was provided
      if (body.chiefComplaint) {
        await captureMessage({
          consultationId: consultation.id,
          role: 'USER',
          content: body.chiefComplaint,
          contentType: 'TEXT',
        });
      }

      res.status(201).json({ success: true, data: consultation });
    } catch (err) {
      next(err);
    }
  },
);

// ─── PATCH /api/consultations/:id/message ──────────────────────

consultationRouter.patch(
  '/consultations/:id/message',
  requireUser,
  validateParams(consultationIdParamSchema),
  validate(consultationMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: consultationId } = req.params as { id: string };
      const body = req.body as {
        role: 'USER' | 'ASSISTANT' | 'SYSTEM';
        content: string;
        contentType?: 'TEXT' | 'IMAGE' | 'CHIPS' | 'SYSTEM_EVENT';
        imageUrl?: string | null;
        chips?: unknown;
        selectedChip?: string | null;
        aiProvider?: string | null;
        aiModel?: string | null;
        aiLatencyMs?: number | null;
        aiTokensInput?: number | null;
        aiTokensOutput?: number | null;
        aiCostUsd?: number | null;
        promptVersion?: string | null;
      };

      const result = await captureMessage({
        consultationId,
        role: body.role,
        content: body.content,
        contentType: body.contentType,
        imageUrl: body.imageUrl,
        chips: body.chips as Prisma.InputJsonValue | null,
        selectedChip: body.selectedChip,
        aiProvider: body.aiProvider,
        aiModel: body.aiModel,
        aiLatencyMs: body.aiLatencyMs,
        aiTokensInput: body.aiTokensInput,
        aiTokensOutput: body.aiTokensOutput,
        aiCostUsd: body.aiCostUsd,
        promptVersion: body.promptVersion,
      });

      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/consultations/:id/complete ──────────────────────

consultationRouter.post(
  '/consultations/:id/complete',
  requireUser,
  validateParams(consultationIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: consultationId } = req.params as { id: string };
      const userId = req.auth!.sub;

      const existing = await prisma.consultation.findUnique({
        where: { id: consultationId },
        select: { userId: true, status: true },
      });
      if (!existing) throw new NotFoundError('Consultation not found');
      if (existing.userId !== userId) throw new ForbiddenError('Not your consultation');

      const updated = await prisma.consultation.update({
        where: { id: consultationId },
        data: { status: 'COMPLETED', completedAt: new Date() },
        select: { id: true, status: true, completedAt: true },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/consultations/:id/pdf (placeholder — Task #56) ──

consultationRouter.get(
  '/consultations/:id/pdf',
  validateParams(consultationIdParamSchema),
  async (_req, res) => {
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'PDF download moves to Task #56' },
    });
  },
);
