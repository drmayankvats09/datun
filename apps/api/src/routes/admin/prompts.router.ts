// ═══════════════════════════════════════════════════════════════
// ADMIN — PROMPT VERSIONING + ROLLOUT
//
// Wired to real Wave 12 API:
//   PromptStore: createVersion / activate / listAll / getActive
//   PromptRolloutOrchestrator: startRollout / evaluateRamp
//
// PromptVersion uses composite unique key (version, modelTarget) —
// NOT a single 'key' field. Activation requires both.
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { PromptStore, PromptRolloutOrchestrator } from '@repo/db/prisma/seeds/wave12';
import { validate } from '../../middleware/validate.js';
import { logger } from '../../lib/logger.js';

export const promptsRouter = Router();
const store = new PromptStore(prisma);
const orchestrator = new PromptRolloutOrchestrator(prisma);

/** Narrow Express's parsed param union (string | string[]) to a single non-empty string. */
function pickStr(raw: unknown): string {
  if (typeof raw === 'string' && raw.length > 0) return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].length > 0) return raw[0];
  return '';
}

// ─── List all prompt versions, optionally filtered by modelTarget ─
promptsRouter.get('/', async (req, res) => {
  const modelTarget = pickStr(req.query.modelTarget) || undefined;
  const versions = await store.listAll(modelTarget);
  return res.json(versions);
});

// ─── Get currently active prompt for a modelTarget ───────────────
promptsRouter.get('/active/:modelTarget', async (req, res) => {
  const modelTarget = pickStr(req.params.modelTarget);
  if (!modelTarget) {
    return res.status(400).json({ error: 'Invalid modelTarget parameter' });
  }
  const active = await store.getActive(modelTarget);
  if (!active) {
    return res.status(404).json({ error: 'No active prompt for that modelTarget' });
  }
  return res.json(active);
});

// ─── Get single version with rollout plan ────────────────────────
promptsRouter.get('/:id', async (req, res) => {
  const id = pickStr(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id parameter' });

  const v = await prisma.promptVersion.findUnique({
    where: { id },
    include: { rolloutPlan: true },
  });
  if (!v) return res.status(404).json({ error: 'Not found' });
  return res.json(v);
});

// ─── Create new prompt version ───────────────────────────────────
const CreateSchema = z.object({
  body: z.object({
    version: z.string().min(1),
    modelTarget: z.string().min(1),
    systemPrompt: z.string().min(10),
    notes: z.string().optional(),
  }),
});
promptsRouter.post('/', validate(CreateSchema), async (req, res) => {
  const created = await store.createVersion({
    version: req.body.version,
    modelTarget: req.body.modelTarget,
    systemPrompt: req.body.systemPrompt,
    notes: req.body.notes,
    createdBy: 'admin',
  });
  logger.info('Prompt version created via API', {
    promptVersionId: created.id,
    cacheKey: created.cacheKey,
    version: req.body.version,
    modelTarget: req.body.modelTarget,
  });
  return res.status(201).json(created);
});

// ─── Activate a prompt version ───────────────────────────────────
const ActivateSchema = z.object({
  body: z.object({
    version: z.string().min(1),
    modelTarget: z.string().min(1),
  }),
});
promptsRouter.post('/:id/activate', validate(ActivateSchema), async (req, res) => {
  const id = pickStr(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id parameter' });

  await store.activate(req.body.version, req.body.modelTarget);
  logger.info('Prompt activated via API', {
    promptVersionId: id,
    version: req.body.version,
    modelTarget: req.body.modelTarget,
  });
  return res.json({
    ok: true,
    version: req.body.version,
    modelTarget: req.body.modelTarget,
  });
});

// ─── Start staged rollout for a prompt version ───────────────────
const RolloutPlanSchema = z.object({
  body: z.object({
    startPct: z.number().min(1).max(100).default(10),
    stepPct: z.number().min(1).max(100).default(20),
    intervalHours: z.number().min(0).default(24),
  }),
});
promptsRouter.post('/:id/rollout-plan', validate(RolloutPlanSchema), async (req, res) => {
  const id = pickStr(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id parameter' });

  await orchestrator.startRollout(id, req.body.startPct, req.body.stepPct, req.body.intervalHours);
  logger.info('Prompt rollout plan started', {
    promptVersionId: id,
    startPct: req.body.startPct,
    stepPct: req.body.stepPct,
    intervalHours: req.body.intervalHours,
  });
  return res.status(201).json({ ok: true, promptVersionId: id });
});

// ─── Evaluate ramp decision (continue/ramp/rollback/complete) ────
const AdvanceSchema = z.object({
  body: z.object({
    safetyViolationRate: z.number().min(0).max(1),
    compositeScore: z.number().min(0).max(1),
    baselineScore: z.number().min(0).max(1),
  }),
});
promptsRouter.post('/:id/rollout-advance', validate(AdvanceSchema), async (req, res) => {
  const id = pickStr(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id parameter' });

  const decision = await orchestrator.evaluateRamp(
    id,
    req.body.safetyViolationRate,
    req.body.compositeScore,
    req.body.baselineScore,
  );
  return res.json(decision);
});

// ─── Emergency rollback (forces rollback via safety violation flag) ──
const RollbackSchema = z.object({
  body: z.object({ reason: z.string().min(10) }),
});
promptsRouter.post('/:id/rollback', validate(RollbackSchema), async (req, res) => {
  const id = pickStr(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id parameter' });

  const decision = await orchestrator.evaluateRamp(id, 1.0, 0, 1);
  logger.warn('Emergency rollback triggered', {
    promptVersionId: id,
    reason: req.body.reason,
    decision,
  });
  return res.json({ ok: true, decision });
});
