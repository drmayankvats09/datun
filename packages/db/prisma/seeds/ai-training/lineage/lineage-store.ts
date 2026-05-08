// ═══════════════════════════════════════════════════════════════
// LINEAGE STORE — DB-backed provenance tracking
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import type { SynthesizedExample } from '../synthesis/synthesis.types';

export class LineageStore {
  constructor(private readonly prisma: PrismaClient) {}

  async recordExample(ex: SynthesizedExample, parentId?: string): Promise<void> {
    await this.prisma.trainingExample.create({
      data: {
        id: ex.id,
        chiefComplaint: ex.chiefComplaint,
        locale: ex.locale,
        patientContext: ex.patientContext as never,
        qualityScore: ex.qualityScore,
        source: `synthetic-${ex.provenance.strategy}`,
        parentId: parentId ?? ex.provenance.seedExampleId,
        generatorModel: ex.provenance.generatorModel,
      },
    });
  }

  async approveExample(id: string, reviewerId: string): Promise<void> {
    await this.prisma.trainingExample.update({
      where: { id },
      data: { reviewedById: reviewerId, reviewedAt: new Date(), approvedAt: new Date() },
    });
  }

  async excludeExample(id: string, reason: string): Promise<void> {
    await this.prisma.trainingExample.update({
      where: { id },
      data: { excludedReason: reason },
    });
  }

  async traceLineage(
    id: string,
  ): Promise<Array<{ id: string; source: string; parentId: string | null }>> {
    const path: Array<{ id: string; source: string; parentId: string | null }> = [];
    let currentId: string | null = id;
    while (currentId) {
      const ex: { id: string; source: string; parentId: string | null } | null =
        await this.prisma.trainingExample.findUnique({
          where: { id: currentId },
          select: { id: true, source: true, parentId: true },
        });
      if (!ex) break;
      path.push(ex);
      currentId = ex.parentId;
    }
    return path;
  }

  async getRunDataset(
    runId: string,
  ): Promise<Array<{ id: string; source: string; approvedAt: Date | null }>> {
    return this.prisma.trainingExample.findMany({
      where: { usedInRuns: { has: runId } },
      select: { id: true, source: true, approvedAt: true },
    });
  }

  async modelCollapseRiskReport(): Promise<{
    totalExamples: number;
    syntheticFraction: number;
    multiGenerationCount: number;
    risk: 'low' | 'medium' | 'high';
  }> {
    const total = await this.prisma.trainingExample.count();
    const synthetic = await this.prisma.trainingExample.count({
      where: { source: { not: 'real' } },
    });
    // Multi-gen: synthetic from synthetic
    const all = await this.prisma.trainingExample.findMany({
      where: { source: { not: 'real' }, parentId: { not: null } },
      select: { id: true, parentId: true },
    });
    let multiGen = 0;
    for (const e of all) {
      if (e.parentId) {
        const parent = await this.prisma.trainingExample.findUnique({
          where: { id: e.parentId },
          select: { source: true },
        });
        if (parent && parent.source !== 'real') multiGen++;
      }
    }
    const syntheticFraction = total > 0 ? synthetic / total : 0;
    const risk: 'low' | 'medium' | 'high' =
      multiGen / Math.max(total, 1) > 0.3 ? 'high' : syntheticFraction > 0.5 ? 'medium' : 'low';
    return { totalExamples: total, syntheticFraction, multiGenerationCount: multiGen, risk };
  }
}
