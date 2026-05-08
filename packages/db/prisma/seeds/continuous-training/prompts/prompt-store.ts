// ═══════════════════════════════════════════════════════════════
// PROMPT STORE — versioned CRUD with cache-key generation
// Aligned with Anthropic prompt caching docs (Apr 2026)
// ═══════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

export interface PromptDraft {
  readonly version: string;
  readonly modelTarget: string;
  readonly systemPrompt: string;
  readonly notes?: string;
  readonly createdBy?: string;
}

export class PromptStore {
  constructor(private readonly prisma: PrismaClient) {}

  computeCacheKey(modelTarget: string, systemPrompt: string): string {
    return `${modelTarget}:${createHash('sha256').update(systemPrompt).digest('hex').slice(0, 16)}`;
  }

  async createVersion(draft: PromptDraft): Promise<{ id: string; cacheKey: string }> {
    const cacheKey = this.computeCacheKey(draft.modelTarget, draft.systemPrompt);
    const created = await this.prisma.promptVersion.create({
      data: {
        version: draft.version,
        modelTarget: draft.modelTarget,
        systemPrompt: draft.systemPrompt,
        notes: draft.notes ?? null,
        active: false,
        cacheKey,
        createdBy: draft.createdBy ?? null,
      },
    });
    return { id: created.id, cacheKey };
  }

  async getActive(
    modelTarget: string,
  ): Promise<{ version: string; systemPrompt: string; cacheKey: string | null } | null> {
    return this.prisma.promptVersion.findFirst({
      where: { modelTarget, active: true, retiredAt: null },
      select: { version: true, systemPrompt: true, cacheKey: true },
    });
  }

  async activate(version: string, modelTarget: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.promptVersion.updateMany({
        where: { modelTarget, active: true },
        data: { active: false, retiredAt: new Date() },
      }),
      this.prisma.promptVersion.update({
        where: { version_modelTarget: { version, modelTarget } },
        data: { active: true },
      }),
    ]);
  }

  async listAll(modelTarget?: string) {
    return this.prisma.promptVersion.findMany({
      where: modelTarget ? { modelTarget } : {},
      orderBy: { releasedAt: 'desc' },
    });
  }
}
