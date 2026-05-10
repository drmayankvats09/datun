// ═══════════════════════════════════════════════════════════════
// ADMIN — DATA QUALITY
//
// Read & remediate quarantined rows. Backed by Wave 8 quarantine store.
//
// Schema fields:
//   id, sourceTable, sourceRowId, payload, reason, contractVersion,
//   severity, status, remediatedAt, remediatedBy, createdAt
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { validate } from '../../middleware/validate.js';
import { logger } from '../../lib/logger.js';

export const dataQualityAdminRouter = Router();

/** Narrow Express's parsed param union (string | string[]) to a single non-empty string. */
function pickStr(raw: unknown): string {
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].length > 0) return raw[0];
  return '';
}

// ─── List quarantined rows by status ─────────────────────────────
dataQualityAdminRouter.get('/quarantine', async (req, res) => {
  const status = pickStr(req.query.status) || 'pending';
  const rows = await prisma.quarantinedRow.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return res.json(rows);
});

// ─── Mark a quarantined row as remediated ────────────────────────
const RemediateSchema = z.object({
  body: z.object({
    remediatedBy: z.string().min(1),
    notes: z.string().optional(),
  }),
});

dataQualityAdminRouter.post(
  '/quarantine/:id/remediate',
  validate(RemediateSchema),
  async (req, res) => {
    const id = pickStr(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Invalid id parameter' });
    }

    const updated = await prisma.quarantinedRow.update({
      where: { id },
      data: {
        status: 'remediated',
        remediatedAt: new Date(),
        remediatedBy: req.body.remediatedBy,
      },
    });
    logger.info('Quarantine entry remediated', {
      id,
      remediatedBy: req.body.remediatedBy,
      sourceTable: updated.sourceTable,
    });
    return res.json(updated);
  },
);

// ─── Quarantine summary by source table ──────────────────────────
dataQualityAdminRouter.get('/quarantine/summary', async (_req, res) => {
  const summary = await prisma.quarantinedRow.groupBy({
    by: ['sourceTable', 'status'],
    _count: { _all: true },
  });
  return res.json(summary);
});
