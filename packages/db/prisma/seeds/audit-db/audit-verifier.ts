// ═══════════════════════════════════════════════════════════════
// AUDIT VERIFIER — re-derive hash chain, detect tampering
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

export interface VerifyResult {
  runId: string;
  rowsChecked: number;
  tamperedRows: Array<{ id: string; module: string; expected: string; actual: string }>;
  passed: boolean;
}

export async function verifyAuditChain(prisma: PrismaClient, runId: string): Promise<VerifyResult> {
  const rows = await prisma.seedAuditLog.findMany({
    where: { runId },
    orderBy: { occurredAt: 'asc' },
  });
  const tampered: VerifyResult['tamperedRows'] = [];
  let prevHash: string | null = null;
  for (const r of rows) {
    const canonical = JSON.stringify({
      runId: r.runId,
      module: r.module,
      action: r.action,
      payload: r.payload,
    });
    const expected: string = createHash('sha256')
      .update((prevHash ?? '') + canonical)
      .digest('hex');
    if (expected !== r.rowHash || r.prevHash !== prevHash) {
      tampered.push({ id: r.id, module: r.module, expected, actual: r.rowHash });
    }
    prevHash = r.rowHash;
  }
  return { runId, rowsChecked: rows.length, tamperedRows: tampered, passed: tampered.length === 0 };
}
