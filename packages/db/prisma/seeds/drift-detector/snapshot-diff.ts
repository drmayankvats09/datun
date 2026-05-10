// ═══════════════════════════════════════════════════════════════
// SNAPSHOT DIFF — compare two database states for drift detection
// ═══════════════════════════════════════════════════════════════
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const TABLES = ['user', 'patient', 'clinic', 'doctor', 'consultation'] as const;

export interface SnapshotDiff {
  table: string;
  countA: number;
  countB: number;
  hashA: string;
  hashB: string;
  identical: boolean;
}

export async function snapshotDiff(urlA: string, urlB: string): Promise<SnapshotDiff[]> {
  const a = new PrismaClient({ datasources: { db: { url: urlA } } });
  const b = new PrismaClient({ datasources: { db: { url: urlB } } });
  const results: SnapshotDiff[] = [];
  try {
    for (const table of TABLES) {
      const aDelegate = (
        a as unknown as Record<string, { findMany: (args: object) => Promise<unknown[]> }>
      )[table];
      const bDelegate = (
        b as unknown as Record<string, { findMany: (args: object) => Promise<unknown[]> }>
      )[table];
      if (!aDelegate || !bDelegate) continue;
      const [rowsA, rowsB] = await Promise.all([
        aDelegate.findMany({ orderBy: { id: 'asc' } }),
        bDelegate.findMany({ orderBy: { id: 'asc' } }),
      ]);
      const hash = (rows: unknown[]): string =>
        createHash('sha256')
          .update(
            JSON.stringify(
              rows.map((r) => {
                const safe =
                  typeof r === 'object' && r !== null ? (r as Record<string, unknown>) : {};
                return { ...safe, createdAt: undefined, updatedAt: undefined };
              }),
            ),
          )
          .digest('hex');
      const hA = hash(rowsA);
      const hB = hash(rowsB);
      results.push({
        table,
        countA: rowsA.length,
        countB: rowsB.length,
        hashA: hA,
        hashB: hB,
        identical: hA === hB,
      });
    }
  } finally {
    await a.$disconnect();
    await b.$disconnect();
  }
  return results;
}
