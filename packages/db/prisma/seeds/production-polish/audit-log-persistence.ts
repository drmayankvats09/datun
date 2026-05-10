// ═══════════════════════════════════════════════════════════════
// AUDIT LOG PERSISTENCE — every seed action recorded
// DPDP §10 + SOC 2 CC7.2
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import type { OrchestratorRunResult } from '../modules/runtime/saga-orchestrator';

export interface SeedAuditEvent {
  readonly timestamp: string;
  readonly runId: string;
  readonly actor: string;
  readonly action:
    | 'SEED_STARTED'
    | 'SEED_COMPLETED'
    | 'SEED_FAILED'
    | 'SNAPSHOT_TAKEN'
    | 'EXPORT_GENERATED'
    | 'ANONYMIZATION_APPLIED';
  readonly env: string;
  readonly scenario: string;
  readonly recordsAffected: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export class SeedAuditLogger {
  constructor(private readonly prisma: PrismaClient) {}

  async log(event: SeedAuditEvent): Promise<void> {
    const model = (
      this.prisma as unknown as { auditLog?: { create: (a: object) => Promise<unknown> } }
    ).auditLog;
    if (!model?.create) return;
    try {
      await model.create({
        data: {
          actorId: event.actor,
          action: event.action,
          entityType: 'SEED_RUN',
          entityId: event.runId,
          metadata: event.metadata as object,
          createdAt: new Date(event.timestamp),
        },
      });
    } catch {
      // Audit log writes never crash main flow
    }
  }

  async logRunResult(result: OrchestratorRunResult, env: string, scenario: string): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      runId: result.runId,
      actor: process.env.USER ?? 'ci-bot',
      action: result.status === 'COMPLETED' ? 'SEED_COMPLETED' : 'SEED_FAILED',
      env,
      scenario,
      recordsAffected: result.totalRecordsCreated,
      metadata: {
        status: result.status,
        completedCount: result.completedCount,
        failedCount: result.failedCount,
        durationMs: result.totalDurationMs,
      },
    });
  }
}
