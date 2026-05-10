// ═══════════════════════════════════════════════════════════════
// CONCEPT DRIFT — urgency distribution shift over time
// ═══════════════════════════════════════════════════════════════
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { DriftAlert } from './drift.types';

const URGENCY_LEVELS = ['EMERGENCY', 'URGENT', 'MODERATE', 'ROUTINE'] as const;

export async function detectUrgencyDistributionDrift(
  prisma: PrismaClient,
  baselineDays = 30,
  comparisonDays = 7,
): Promise<DriftAlert | null> {
  const now = Date.now();
  const baselineStart = new Date(now - (baselineDays + comparisonDays) * 86_400_000);
  const baselineEnd = new Date(now - comparisonDays * 86_400_000);
  const compStart = new Date(now - comparisonDays * 86_400_000);

  const baseline: Record<string, number> = {};
  const recent: Record<string, number> = {};
  for (const u of URGENCY_LEVELS) {
    baseline[u] = await prisma.consultation.count({
      where: { urgency: u, createdAt: { gte: baselineStart, lt: baselineEnd } },
    } as never);
    recent[u] = await prisma.consultation.count({
      where: { urgency: u, createdAt: { gte: compStart } },
    } as never);
  }
  const totalBase = Object.values(baseline).reduce((s, v) => s + v, 0);
  const totalRec = Object.values(recent).reduce((s, v) => s + v, 0);
  if (totalBase < 100 || totalRec < 50) return null;

  // Population Stability Index (PSI) — robust to base counts
  let psi = 0;
  for (const u of URGENCY_LEVELS) {
    const pBase = (baseline[u]! + 1) / (totalBase + URGENCY_LEVELS.length);
    const pRec = (recent[u]! + 1) / (totalRec + URGENCY_LEVELS.length);
    psi += (pRec - pBase) * Math.log(pRec / pBase);
  }
  const threshold = 0.2;
  if (psi < threshold) return null;

  return {
    id: randomUUID(),
    kind: 'concept',
    metric: 'consultation.urgency.psi',
    observedValue: psi,
    threshold,
    windowDays: comparisonDays,
    severity: psi > 0.5 ? 'critical' : 'warning',
    detectedAt: new Date(),
    actionRequired:
      psi > 0.5
        ? 'Urgency distribution shifted significantly — re-run Wave 7 eval suite immediately + check for prompt regression'
        : 'Mild urgency drift — monitor next 3 days, schedule eval re-run',
  };
}
