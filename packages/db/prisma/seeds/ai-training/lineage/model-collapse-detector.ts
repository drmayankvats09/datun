// ═══════════════════════════════════════════════════════════════
// MODEL COLLAPSE DETECTOR
//
// Critical 2026 risk: training a model on its own synthetic outputs
// causes "model collapse" — distribution narrows, hallucinations
// amplify, novel cases drop out. (Shumailov et al., Nature 2024.)
//
// This detector walks the lineage graph (parentId chains) and flags:
//   1. Synthetic-only chains > maxSyntheticDepth
//   2. % of training set that traces back to a single seed example
//   3. Generator-model concentration (one model authoring >threshold%)
//
// Used by:
//   - pnpm training:lineage:risk (CLI in package.json)
//   - GitHub Actions weekly synthesis workflow gate
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface CollapseRiskReport {
  readonly totalExamples: number;
  readonly syntheticChains: {
    readonly maxDepth: number;
    readonly chainsAboveThreshold: number;
    readonly threshold: number;
  };
  readonly seedConcentration: {
    readonly topSeedId: string | null;
    readonly topSeedShare: number;
    readonly distinctSeeds: number;
  };
  readonly generatorConcentration: Record<string, number>;
  readonly verdict: 'OK' | 'WARN' | 'CRITICAL';
  readonly recommendations: readonly string[];
}

interface LineageRow {
  readonly id: string;
  readonly source: string;
  readonly parentId: string | null;
  readonly generatorModel: string | null;
}

const DEFAULT_MAX_SYNTHETIC_DEPTH = 3;
const DEFAULT_SEED_CONCENTRATION_THRESHOLD = 0.05; // 5% of training from single seed = warn
const DEFAULT_GENERATOR_CONCENTRATION_THRESHOLD = 0.6; // one model > 60% = warn

/**
 * Walks parentId chain to compute synthetic depth.
 * A chain of N synthetic-* sources means model trained on N generations
 * removed from real data — high collapse risk if N > 3.
 *
 * @returns depth of synthetic chain (0 = real data, 1 = single synth gen, ...)
 */
function computeChainDepth(rowId: string, byId: Map<string, LineageRow>): number {
  let depth = 0;
  let cursor: string | null = rowId;
  const visited = new Set<string>();
  while (cursor) {
    if (visited.has(cursor)) {
      logger.warn({ cursor }, 'Lineage cycle detected — stopping walk');
      break;
    }
    visited.add(cursor);
    const row = byId.get(cursor);
    if (!row) break;
    if (row.source === 'real') break;
    depth += 1;
    cursor = row.parentId;
  }
  return depth;
}

/** Walks back to find the originating seed example. */
function findRootSeed(rowId: string, byId: Map<string, LineageRow>): string | null {
  let cursor: string | null = rowId;
  const visited = new Set<string>();
  while (cursor) {
    if (visited.has(cursor)) return null;
    visited.add(cursor);
    const row = byId.get(cursor);
    if (!row) return null;
    if (row.source === 'real' || !row.parentId) return row.id;
    cursor = row.parentId;
  }
  return null;
}

export interface DetectOptions {
  readonly maxSyntheticDepth?: number;
  readonly seedConcentrationThreshold?: number;
  readonly generatorConcentrationThreshold?: number;
}

export async function detectModelCollapse(
  prisma: PrismaClient,
  opts: DetectOptions = {},
): Promise<CollapseRiskReport> {
  const maxDepthThreshold = opts.maxSyntheticDepth ?? DEFAULT_MAX_SYNTHETIC_DEPTH;
  const seedThreshold = opts.seedConcentrationThreshold ?? DEFAULT_SEED_CONCENTRATION_THRESHOLD;
  const genThreshold =
    opts.generatorConcentrationThreshold ?? DEFAULT_GENERATOR_CONCENTRATION_THRESHOLD;

  const rows = await prisma.trainingExample.findMany({
    where: { approvedAt: { not: null }, excludedReason: null },
    select: { id: true, source: true, parentId: true, generatorModel: true },
  });

  const byId = new Map<string, LineageRow>(rows.map((r) => [r.id, r]));

  // 1. Synthetic chain depths
  let maxDepth = 0;
  let chainsAboveThreshold = 0;
  for (const r of rows) {
    if (r.source === 'real') continue;
    const d = computeChainDepth(r.id, byId);
    if (d > maxDepth) maxDepth = d;
    if (d > maxDepthThreshold) chainsAboveThreshold += 1;
  }

  // 2. Seed concentration
  const perSeed = new Map<string, number>();
  for (const r of rows) {
    const seed = findRootSeed(r.id, byId);
    if (!seed) continue;
    perSeed.set(seed, (perSeed.get(seed) ?? 0) + 1);
  }
  let topSeedId: string | null = null;
  let topCount = 0;
  for (const [id, count] of perSeed) {
    if (count > topCount) {
      topCount = count;
      topSeedId = id;
    }
  }
  const topSeedShare = topCount / Math.max(1, rows.length);

  // 3. Generator concentration
  const genCounts: Record<string, number> = {};
  for (const r of rows) {
    if (!r.generatorModel) continue;
    genCounts[r.generatorModel] = (genCounts[r.generatorModel] ?? 0) + 1;
  }
  const genTotal = Object.values(genCounts).reduce((s, c) => s + c, 0);
  const generatorConcentration: Record<string, number> = {};
  for (const [model, count] of Object.entries(genCounts)) {
    generatorConcentration[model] = count / Math.max(1, genTotal);
  }

  // Verdict + recommendations
  const recommendations: string[] = [];
  let verdict: 'OK' | 'WARN' | 'CRITICAL' = 'OK';

  if (chainsAboveThreshold > rows.length * 0.1) {
    verdict = 'CRITICAL';
    recommendations.push(
      `${chainsAboveThreshold} chains exceed depth ${maxDepthThreshold} — inject more real data before next FT run.`,
    );
  } else if (chainsAboveThreshold > 0) {
    verdict = 'WARN' as 'OK' | 'WARN' | 'CRITICAL';
    recommendations.push(`${chainsAboveThreshold} synthetic chains too deep — review.`);
  }

  if (topSeedShare > seedThreshold) {
    if (verdict !== 'CRITICAL') verdict = 'WARN';
    recommendations.push(
      `Seed ${topSeedId} accounts for ${(topSeedShare * 100).toFixed(1)}% of training — diversify seeds.`,
    );
  }

  for (const [model, share] of Object.entries(generatorConcentration)) {
    if (share > genThreshold) {
      if (verdict !== 'CRITICAL') verdict = 'WARN';
      recommendations.push(
        `Generator ${model} authored ${(share * 100).toFixed(1)}% — rotate generators to reduce model bias.`,
      );
    }
  }

  return {
    totalExamples: rows.length,
    syntheticChains: { maxDepth, chainsAboveThreshold, threshold: maxDepthThreshold },
    seedConcentration: {
      topSeedId,
      topSeedShare,
      distinctSeeds: perSeed.size,
    },
    generatorConcentration,
    verdict,
    recommendations,
  };
}
