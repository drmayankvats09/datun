// ═══════════════════════════════════════════════════════════════
// AUTO-REMEDIATOR — known-fix patterns: trim strings, lowercase enums
// Only auto-remediates 'warning' severity; 'error'/'critical' need human
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';

/**
 * Narrow delegate shape for dynamic table access in auto-remediation.
 * We only need `update` here. Keys map to lower-camel-case Prisma model names.
 */
interface UpdateableDelegate {
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
}
type DynamicPrismaAccess = Record<string, UpdateableDelegate>;

export interface RemediationResult {
  readonly quarantineId: string;
  readonly applied: boolean;
  readonly remediation?: string;
  readonly reason?: string;
}

export async function attemptAutoRemediation(
  prisma: PrismaClient,
  limit = 50,
): Promise<readonly RemediationResult[]> {
  const candidates = await prisma.quarantinedRow.findMany({
    where: { status: 'pending', severity: 'warning' },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  const out: RemediationResult[] = [];
  for (const c of candidates as Array<{
    id: string;
    sourceTable: string;
    sourceRowId: string;
    payload: Record<string, unknown>;
    reason: string;
  }>) {
    if (c.reason.includes('enum')) {
      const fixed: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(c.payload)) {
        if (typeof v === 'string') fixed[k] = v.toLowerCase().trim();
        else fixed[k] = v;
      }
      try {
        await (prisma as unknown as DynamicPrismaAccess)[lcFirst(c.sourceTable)]!.update({
          where: { id: c.sourceRowId },
          data: fixed,
        });
        await prisma.quarantinedRow.update({
          where: { id: c.id },
          data: { status: 'remediated', remediatedAt: new Date(), remediatedBy: 'auto-remediator' },
        });
        out.push({
          quarantineId: c.id,
          applied: true,
          remediation: 'lowercase + trim string fields',
        });
      } catch (err) {
        out.push({
          quarantineId: c.id,
          applied: false,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      out.push({ quarantineId: c.id, applied: false, reason: 'no auto-fix pattern match' });
    }
  }
  return out;
}

function lcFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
