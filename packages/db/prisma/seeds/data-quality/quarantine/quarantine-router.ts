// ═══════════════════════════════════════════════════════════════
// QUARANTINE ROUTER — sends bad rows to quarantine table
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';
import type { ContractViolation } from '../contracts/contract.types';

export async function quarantineRow(
  prisma: PrismaClient,
  sourceTable: string,
  sourceRowId: string,
  payload: Record<string, unknown>,
  violations: readonly ContractViolation[],
): Promise<string> {
  const reason = violations
    .map((v) => `[${v.severity}] ${v.violationKind}: ${v.message}`)
    .join('; ');
  const maxSeverity = violations.reduce<string>((max, v) => {
    const order = { info: 0, warning: 1, error: 2, critical: 3 };
    return (order[v.severity as keyof typeof order] ?? 0) > (order[max as keyof typeof order] ?? 0)
      ? v.severity
      : max;
  }, 'info');

  const row = await prisma.quarantinedRow.create({
    data: {
      sourceTable,
      sourceRowId,
      payload: payload as never,
      reason,
      contractVersion: violations[0]?.contractVersion ?? 'unknown',
      severity: maxSeverity,
    },
  });
  return row.id;
}

export async function listPendingQuarantine(
  prisma: PrismaClient,
  sourceTable?: string,
  limit = 100,
) {
  return prisma.quarantinedRow.findMany({
    where: { status: 'pending', ...(sourceTable ? { sourceTable } : {}) },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}
