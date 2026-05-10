// ═══════════════════════════════════════════════════════════════
// AUDIT WRITER — DB-backed, hash-chained, tamper-evident
// Source: RFC 6962 Merkle audit log + DPDP §10 persistent storage
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { toJsonInput } from '@seeds/factories/core/json-helpers';
import { createHash } from 'node:crypto';

export type AuditAction = 'started' | 'completed' | 'failed' | 'compensated';

export interface AuditEvent {
  runId: string;
  module: string;
  action: AuditAction;
  payload?: Record<string, unknown>;
}

export class AuditWriter {
  private cachedPrevHash = new Map<string, string | null>();

  constructor(private readonly prisma: PrismaClient) {}

  async write(event: AuditEvent): Promise<void> {
    const prevHash = await this.getPrevHash(event.runId);
    const canonical = JSON.stringify({
      runId: event.runId,
      module: event.module,
      action: event.action,
      payload: event.payload ?? {},
    });
    const rowHash = createHash('sha256')
      .update((prevHash ?? '') + canonical)
      .digest('hex');
    await this.prisma.seedAuditLog.create({
      data: {
        runId: event.runId,
        module: event.module,
        action: event.action,
        payload: toJsonInput(event.payload) ?? {},
        prevHash,
        rowHash,
      },
    });
    this.cachedPrevHash.set(event.runId, rowHash);
  }

  private async getPrevHash(runId: string): Promise<string | null> {
    if (this.cachedPrevHash.has(runId)) return this.cachedPrevHash.get(runId)!;
    const last = await this.prisma.seedAuditLog.findFirst({
      where: { runId },
      orderBy: { occurredAt: 'desc' },
      select: { rowHash: true },
    });
    return last?.rowHash ?? null;
  }
}
