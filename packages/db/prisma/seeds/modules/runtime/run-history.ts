// ═══════════════════════════════════════════════════════════════
// RUN HISTORY STORE — Persistent record of every seed run
// Pattern: Temporal Event History
// Note: requires SeedRunHistory model in schema.prisma (graceful no-op if absent)
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import type { ModuleResult } from '../core/module.types';

interface RunStartArgs {
  readonly runId: string;
  readonly env: string;
  readonly scenario: string;
  readonly moduleCount: number;
  readonly tenantId: string | null;
}

interface RunCompleteArgs {
  readonly runId: string;
  readonly status: string;
  readonly totalDurationMs: number;
  readonly totalRecordsCreated: number;
}

export class SeedRunHistoryStore {
  constructor(private readonly prisma: PrismaClient) {}

  private get model():
    | { create?: (args: object) => Promise<unknown>; update?: (args: object) => Promise<unknown> }
    | undefined {
    try {
      if (!this.prisma) return undefined;
      return (
        this.prisma as unknown as Record<
          string,
          {
            create?: (args: object) => Promise<unknown>;
            update?: (args: object) => Promise<unknown>;
          }
        >
      )?.seedRunHistory;
    } catch {
      return undefined;
    }
  }

  async startRun(args: RunStartArgs): Promise<void> {
    if (!this.model?.create) return;
    try {
      await this.model.create({
        data: {
          id: args.runId,
          environment: args.env,
          scenario: args.scenario,
          moduleCount: args.moduleCount,
          tenantId: args.tenantId,
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });
    } catch {
      // schema model may not exist — graceful no-op
    }
  }

  async completeRun(args: RunCompleteArgs): Promise<void> {
    if (!this.model?.update) return;
    try {
      await this.model.update({
        where: { id: args.runId },
        data: {
          status: args.status,
          completedAt: new Date(),
          totalDurationMs: args.totalDurationMs,
          totalRecordsCreated: args.totalRecordsCreated,
        },
      });
    } catch {
      // schema model may not exist
    }
  }

  async recordModuleResult(_runId: string, _result: ModuleResult): Promise<void> {
    // Optional: record per-module outcome (skipped if model absent)
  }
}
