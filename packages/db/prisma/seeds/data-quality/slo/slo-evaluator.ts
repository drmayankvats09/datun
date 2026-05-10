// ═══════════════════════════════════════════════════════════════
// SLO EVALUATOR — runs SLOs, computes burn rate, persists breaches
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';
import type { SloDefinition, SloStatus } from './slo.types';

export async function evaluateSlo(prisma: PrismaClient, def: SloDefinition): Promise<SloStatus> {
  const { good, total } = await def.query(prisma);
  const observed = total > 0 ? good / total : 1;
  const errorBudget = 1 - def.target;
  const observedFailureRate = 1 - observed;
  const burnRatePct = errorBudget > 0 ? (observedFailureRate / errorBudget) * 100 : 0;

  let status: SloStatus['status'] = 'healthy';
  if (observed < def.target * 0.95) status = 'breached';
  else if (burnRatePct > 50) status = 'at-risk';

  return {
    name: def.name,
    target: def.target,
    observed,
    errorBudget,
    burnRatePct,
    windowSeconds: def.windowSeconds,
    evaluatedAt: new Date(),
    status,
  };
}

export async function evaluateAllSlos(
  prisma: PrismaClient,
  defs: readonly SloDefinition[],
): Promise<readonly SloStatus[]> {
  const out: SloStatus[] = [];
  for (const def of defs) {
    try {
      const status = await evaluateSlo(prisma, def);
      out.push(status);
      if (status.status === 'breached') {
        await prisma.sloBreach
          .create({
            data: {
              sloName: status.name,
              budgetBurnPct: status.burnRatePct,
              observedValue: status.observed,
              thresholdValue: status.target,
              severity: status.burnRatePct > 100 ? 'critical' : 'error',
            },
          })
          .catch(() => undefined);
      }
    } catch (err) {
      out.push({
        name: def.name,
        target: def.target,
        observed: 0,
        errorBudget: 1 - def.target,
        burnRatePct: 100,
        windowSeconds: def.windowSeconds,
        evaluatedAt: new Date(),
        status: 'breached',
      });
    }
  }
  return out;
}
