// ═══════════════════════════════════════════════════════════════
// ADMIN — A/B EXPERIMENTS
//
// Direct prisma queries on ExperimentAssignment table.
// Schema fields: id, experimentKey, userId, variantKey, bucketHash,
//   assignmentReason, metricExposed, conversionEvents, conversionValue,
//   metadata, createdAt, updatedAt, endedAt
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { prisma } from '@repo/db';

export const experimentsRouter = Router();

// ─── List all experiment keys with assignment counts ─────────────
experimentsRouter.get('/', async (_req, res) => {
  const experiments = await prisma.experimentAssignment.groupBy({
    by: ['experimentKey'],
    _count: { _all: true },
    orderBy: { experimentKey: 'asc' },
  });
  return res.json(experiments);
});

// ─── Variant breakdown for a single experiment ───────────────────
experimentsRouter.get('/:key/variants', async (req, res) => {
  const variants = await prisma.experimentAssignment.groupBy({
    by: ['variantKey'],
    where: { experimentKey: req.params.key! },
    _count: { _all: true },
    _avg: { conversionValue: true },
    _sum: { conversionValue: true },
  });
  return res.json({ experimentKey: req.params.key, variants });
});

// ─── Recent assignments (last 100) for debugging ─────────────────
experimentsRouter.get('/:key/recent', async (req, res) => {
  const recent = await prisma.experimentAssignment.findMany({
    where: { experimentKey: req.params.key! },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      userId: true,
      variantKey: true,
      bucketHash: true,
      assignmentReason: true,
      metricExposed: true,
      conversionValue: true,
      createdAt: true,
      updatedAt: true,
      endedAt: true,
    },
  });
  return res.json(recent);
});
