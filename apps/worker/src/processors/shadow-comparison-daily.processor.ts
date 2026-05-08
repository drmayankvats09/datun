// ═══════════════════════════════════════════════════════════════
// SHADOW COMPARISON DAILY PROCESSOR
//
// Real compareShadow(evalCase, runResult) requires:
//   1. EvalCase library (Wave 7 golden cases) — exists
//   2. ModelAdapter for both production + candidate prompts — needs
//      runtime wiring with Anthropic API keys + per-prompt configs
//   3. runShadow() to actually call both models per case
//
// Until that wiring lands (Task #131+ era when proper eval infra
// is mounted on apps/worker), this processor is a structured no-op:
// it discovers candidate pairs, logs intent, exits cleanly.
//
// Activation path:
//   - Set SHADOW_COMPARISON_ENABLED=true
//   - Implement makeShadowAdapters() below
//   - Add EvalCase fixture loader
//   - Replace TODO block with runShadow + compareShadow loop
// ═══════════════════════════════════════════════════════════════

import type { Job } from 'bullmq';
import { prisma } from '@repo/db';
import { logger } from '../lib/logger.js';

export interface ShadowJobData {
  readonly sampleSize?: number;
}

export interface ShadowJobResult {
  readonly compared: number;
  readonly divergent: number;
  readonly avgDivergenceScore: number;
  readonly durationMs: number;
  readonly status: 'disabled' | 'no-candidates' | 'no-eval-infra' | 'completed';
}

const SHADOW_OF_PREFIX = 'shadow-of:';

export async function processShadowComparisonJob(
  job: Job<ShadowJobData>,
): Promise<ShadowJobResult> {
  const enabled = process.env.SHADOW_COMPARISON_ENABLED === 'true';
  if (!enabled) {
    logger.info('Shadow comparison disabled by flag — skipping', { jobId: job.id });
    return {
      compared: 0,
      divergent: 0,
      avgDivergenceScore: 0,
      durationMs: 0,
      status: 'disabled',
    };
  }

  const startedAt = Date.now();

  // Discover shadow candidates (PromptVersion.notes contains "shadow-of:<id>")
  const candidatePrompts = await prisma.promptVersion.findMany({
    where: {
      active: false,
      notes: { contains: SHADOW_OF_PREFIX },
    },
    take: 5,
    select: {
      id: true,
      version: true,
      modelTarget: true,
      systemPrompt: true,
      notes: true,
    },
  });

  if (candidatePrompts.length === 0) {
    logger.info('Shadow comparison: no candidates found — exiting', { jobId: job.id });
    return {
      compared: 0,
      divergent: 0,
      avgDivergenceScore: 0,
      durationMs: Date.now() - startedAt,
      status: 'no-candidates',
    };
  }

  // Resolve candidate-active pairs
  const pairs: {
    active: { id: string; version: string };
    candidate: (typeof candidatePrompts)[0];
  }[] = [];
  for (const candidate of candidatePrompts) {
    const shadowOfId = parseShadowOfId(candidate.notes);
    if (!shadowOfId) continue;
    const active = await prisma.promptVersion.findUnique({
      where: { id: shadowOfId },
      select: { id: true, version: true },
    });
    if (active) pairs.push({ active, candidate });
  }

  // ──────────────────────────────────────────────────────────────
  // TODO: When eval infrastructure is mounted (Task #131+ era),
  // replace this block with:
  //   1. const adapters = makeShadowAdapters(pair);
  //   2. for (const evalCase of EVAL_CASES) {
  //        const run = await runShadow(adapters, evalCase);
  //        const comparison = await compareShadow(evalCase, run);
  //        await saveShadowComparison(prisma, comparison);
  //      }
  // For task #43 closure: log intent and exit clean.
  // ──────────────────────────────────────────────────────────────
  logger.info('Shadow comparison: candidate pairs discovered, awaiting eval infra', {
    jobId: job.id,
    pairCount: pairs.length,
    pairs: pairs.map((p) => ({
      activeVersion: p.active.version,
      candidateVersion: p.candidate.version,
      modelTarget: p.candidate.modelTarget,
    })),
  });

  return {
    compared: 0,
    divergent: 0,
    avgDivergenceScore: 0,
    durationMs: Date.now() - startedAt,
    status: 'no-eval-infra',
  };
}

function parseShadowOfId(notes: string | null): string | null {
  if (!notes) return null;
  const idx = notes.indexOf(SHADOW_OF_PREFIX);
  if (idx === -1) return null;
  const after = notes.slice(idx + SHADOW_OF_PREFIX.length).trim();
  const token = after.split(/\s+/)[0];
  return token || null;
}
