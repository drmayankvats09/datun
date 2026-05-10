// ═══════════════════════════════════════════════════════════════
// SHADOW STORE — persists comparisons for offline analysis
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';
import type { ShadowComparison } from './shadow.types';

export async function saveShadowComparison(
  prisma: PrismaClient,
  c: ShadowComparison,
): Promise<void> {
  await prisma.shadowComparison.create({
    data: {
      id: c.id,
      prompt: c.prompt,
      productionResponse: c.productionResponse,
      candidateResponse: c.candidateResponse,
      productionModel: c.productionModel,
      candidateModel: c.candidateModel,
      compositeDelta: c.compositeDelta,
      safetyDelta: c.safetyDelta,
      latencyDelta: c.latencyDelta,
      recommendedAction: c.recommendedAction,
      comparedAt: c.comparedAt,
    },
  });
}
