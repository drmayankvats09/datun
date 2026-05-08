import { PrismaClient } from '@prisma/client';
import { copyLoad } from './pg-copy-loader';
import { writeFileSync } from 'node:fs';

const SIZES = [1_000, 10_000, 100_000];

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL!;
  const prisma = new PrismaClient();
  const report: Array<{ size: number; method: string; ms: number; rowsPerSec: number }> = [];

  for (const size of SIZES) {
    // Use a synthetic table that exists (SeedAuditLog) — payload is JSON both sides
    const baseRow = {
      runId: 'bench',
      module: 'bulk-bench',
      action: 'completed' as const,
      rowHash: 'h',
      occurredAt: new Date(),
    };
    const rows = Array.from({ length: size }, (_, i) => ({
      id: `bench_${i}`,
      ...baseRow,
      payload: { i, label: `row-${i}` },
    }));

    await prisma.seedAuditLog.deleteMany({ where: { runId: 'bench' } });

    // createMany — Prisma serializes JSON its own way
    const tCm = performance.now();
    await prisma.seedAuditLog.createMany({ data: rows });
    const cmMs = Math.round(performance.now() - tCm);
    report.push({
      size,
      method: 'createMany',
      ms: cmMs,
      rowsPerSec: Math.round((size / cmMs) * 1000),
    });

    await prisma.seedAuditLog.deleteMany({ where: { runId: 'bench' } });

    // COPY — JSON column needs explicit JSON.stringify (matches Prisma's behavior)
    const r = await copyLoad({
      table: 'SeedAuditLog',
      columns: ['id', 'runId', 'module', 'action', 'payload', 'rowHash', 'occurredAt'],
      rows: rows.map((row) => [
        row.id,
        row.runId,
        row.module,
        row.action,
        JSON.stringify(row.payload),
        row.rowHash,
        row.occurredAt.toISOString(),
      ]),
      databaseUrl,
    });
    report.push({ size, method: 'COPY', ms: r.durationMs, rowsPerSec: r.rowsPerSecond });

    await prisma.seedAuditLog.deleteMany({ where: { runId: 'bench' } });
  }

  console.table(report);
  writeFileSync('./tmp/bulk-bench-report.json', JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

if (require.main === module) main().catch(console.error);
