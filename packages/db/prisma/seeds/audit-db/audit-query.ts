// ═══════════════════════════════════════════════════════════════
// AUDIT QUERY — search by run/module/time/action
// ═══════════════════════════════════════════════════════════════
import { PrismaClient, type Prisma } from '@prisma/client';

export interface AuditQuery {
  runId?: string;
  module?: string;
  action?: 'started' | 'completed' | 'failed' | 'compensated';
  since?: Date;
  until?: Date;
  limit?: number;
  cursor?: string;
}

export async function queryAuditLog(prisma: PrismaClient, q: AuditQuery) {
  const where: Prisma.SeedAuditLogWhereInput = {};
  if (q.runId) where.runId = q.runId;
  if (q.module) where.module = q.module;
  if (q.action) where.action = q.action;
  if (q.since || q.until) where.occurredAt = { gte: q.since, lte: q.until };
  return prisma.seedAuditLog.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: q.limit ?? 100,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });
}

export async function getRunSummary(prisma: PrismaClient, runId: string) {
  const rows = await prisma.seedAuditLog.findMany({
    where: { runId },
    orderBy: { occurredAt: 'asc' },
  });
  if (rows.length === 0) return null;
  const completed = rows.filter((r) => r.action === 'completed').length;
  const failed = rows.filter((r) => r.action === 'failed').length;
  const compensated = rows.filter((r) => r.action === 'compensated').length;
  return {
    runId,
    startedAt: rows[0]!.occurredAt,
    finishedAt: rows[rows.length - 1]!.occurredAt,
    moduleCount: new Set(rows.map((r) => r.module)).size,
    completed,
    failed,
    compensated,
    totalEvents: rows.length,
  };
}
