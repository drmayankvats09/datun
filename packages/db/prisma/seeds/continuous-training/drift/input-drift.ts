// ═══════════════════════════════════════════════════════════════
// INPUT DRIFT — KS test on feature distributions over time
// ═══════════════════════════════════════════════════════════════
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { DriftAlert } from './drift.types';

/** Two-sample Kolmogorov-Smirnov test (simplified, no scipy dependency) */
export function ksStatistic(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  const all = [...new Set([...sortedA, ...sortedB])].sort((x, y) => x - y);
  let maxDiff = 0;
  for (const v of all) {
    const cdfA = sortedA.filter((x) => x <= v).length / sortedA.length;
    const cdfB = sortedB.filter((x) => x <= v).length / sortedB.length;
    const d = Math.abs(cdfA - cdfB);
    if (d > maxDiff) maxDiff = d;
  }
  return maxDiff;
}

export async function detectAgeDrift(
  prisma: PrismaClient,
  baselineDays = 30,
  comparisonDays = 7,
): Promise<DriftAlert | null> {
  const now = Date.now();
  const baselineStart = new Date(now - (baselineDays + comparisonDays) * 86_400_000);
  const baselineEnd = new Date(now - comparisonDays * 86_400_000);
  const comparisonStart = new Date(now - comparisonDays * 86_400_000);

  const baseline = await prisma.patient.findMany({
    where: { createdAt: { gte: baselineStart, lt: baselineEnd } },
    select: { ageYears: true },
    take: 5000,
  });
  const recent = await prisma.patient.findMany({
    where: { createdAt: { gte: comparisonStart } },
    select: { ageYears: true },
    take: 5000,
  });
  if (baseline.length < 50 || recent.length < 50) return null;

  const baselineAges = baseline.map((b) => b.ageYears).filter((a): a is number => a !== null);
  const recentAges = recent.map((b) => b.ageYears).filter((a): a is number => a !== null);
  if (baselineAges.length < 50 || recentAges.length < 50) return null;
  const ks = ksStatistic(baselineAges, recentAges);
  const threshold = 0.15;
  if (ks < threshold) return null;

  return {
    id: randomUUID(),
    kind: 'input',
    metric: 'patient.ageYears.ks',
    observedValue: ks,
    threshold,
    windowDays: comparisonDays,
    severity: ks > 0.3 ? 'critical' : 'warning',
    detectedAt: new Date(),
    actionRequired:
      ks > 0.3
        ? 'Patient demographic shift — review prompt safety constraints + golden cases'
        : 'Mild demographic drift — schedule eval re-run within 7 days',
  };
}
