// ═══════════════════════════════════════════════════════════════
// RECOVERY VALIDATOR — assert restored DB matches source signature
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

export async function validateRecovery(
  sourceUrl: string,
  restoredUrl: string,
): Promise<{
  matches: boolean;
  perTable: Array<{
    table: string;
    sourceCount: number;
    restoredCount: number;
    sourceHash: string;
    restoredHash: string;
    match: boolean;
  }>;
}> {
  const tables = ['clinic', 'doctor', 'patient', 'consultation', 'appointment'];
  const a = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  const b = new PrismaClient({ datasources: { db: { url: restoredUrl } } });
  const perTable = [];
  try {
    for (const t of tables) {
      const aDel = (a as unknown as Record<string, { findMany: () => Promise<unknown[]> }>)[t];
      const bDel = (b as unknown as Record<string, { findMany: () => Promise<unknown[]> }>)[t];
      if (!aDel || !bDel) continue;
      const [aRows, bRows] = await Promise.all([aDel.findMany(), bDel.findMany()]);
      const hash = (rows: unknown[]) =>
        createHash('sha256').update(JSON.stringify(rows)).digest('hex');
      const sH = hash(aRows);
      const rH = hash(bRows);
      perTable.push({
        table: t,
        sourceCount: aRows.length,
        restoredCount: bRows.length,
        sourceHash: sH,
        restoredHash: rH,
        match: sH === rH,
      });
    }
  } finally {
    await a.$disconnect();
    await b.$disconnect();
  }
  return { matches: perTable.every((r) => r.match), perTable };
}
