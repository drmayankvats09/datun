// ═══════════════════════════════════════════════════════════════
// EXPERIMENT STORE — DB-backed experiment registry
// Reuses ExperimentAssignment table (Wave 3, line 18495)
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';
import type { ExperimentDefinition, ExperimentSummary } from './experiment.types';
import { assignVariant, bucketHash100 } from './traffic-splitter';
import { checkSrm } from './srm-detector';

export async function recordAssignment(
  prisma: PrismaClient,
  experiment: ExperimentDefinition,
  userId: string,
): Promise<{ variantKey: string; bucketHash: number }> {
  const variant = assignVariant(experiment, userId);
  const bucketHash = bucketHash100(experiment, userId);
  await prisma.experimentAssignment
    .upsert({
      where: { experimentKey_userId: { experimentKey: experiment.key, userId } },
      create: {
        experimentKey: experiment.key,
        userId,
        variantKey: variant.key,
        bucketHash,
        assignmentReason: 'NEW_RANDOM',
        metricExposed: false,
        conversionEvents: [],
        conversionValue: 0,
      },
      update: {},
    })
    .catch(() => undefined);
  return { variantKey: variant.key, bucketHash };
}

export async function summarizeMetric(
  prisma: PrismaClient,
  experimentKey: string,
  metricName: string,
): Promise<readonly ExperimentSummary[]> {
  const rows = (await prisma.experimentAssignment.findMany({
    where: { experimentKey },
    select: { variantKey: true, conversionValue: true },
  })) as Array<{ variantKey: string; conversionValue: number }>;

  const byVariant = new Map<string, number[]>();
  for (const r of rows) {
    if (!byVariant.has(r.variantKey)) byVariant.set(r.variantKey, []);
    byVariant.get(r.variantKey)!.push(r.conversionValue);
  }

  const summaries: ExperimentSummary[] = [];
  for (const [variant, values] of byVariant) {
    const n = values.length;
    if (n === 0) continue;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(n - 1, 1);
    const stddev = Math.sqrt(variance);
    const sem = stddev / Math.sqrt(n);
    summaries.push({
      variantKey: variant,
      sampleSize: n,
      mean,
      stddev,
      ci95Lower: mean - 1.96 * sem,
      ci95Upper: mean + 1.96 * sem,
    });
  }
  return summaries;
}

export async function checkExperimentSrm(
  prisma: PrismaClient,
  experiment: ExperimentDefinition,
): Promise<ReturnType<typeof checkSrm>> {
  const counts: Record<string, number> = {};
  for (const v of experiment.variants) {
    counts[v.key] = await prisma.experimentAssignment.count({
      where: { experimentKey: experiment.key, variantKey: v.key },
    });
  }
  const totalWeight = experiment.variants.reduce((s, v) => s + v.weight, 0);
  const expectedRatios: Record<string, number> = {};
  for (const v of experiment.variants) expectedRatios[v.key] = v.weight / totalWeight;
  return checkSrm(counts, expectedRatios);
}
