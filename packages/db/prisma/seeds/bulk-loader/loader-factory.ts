// ═══════════════════════════════════════════════════════════════
// LOADER FACTORY — auto-selects fastest loader for given row count
// <1k: createMany, 1k-100k: COPY, >100k: COPY + UNLOGGED staging
// ═══════════════════════════════════════════════════════════════
import { PrismaClient } from '@prisma/client';
import { copyLoad } from './pg-copy-loader';
import type { BulkLoadResult, BulkLoader } from './loader.contract';

export interface AutoLoadOptions {
  rows: Array<Record<string, unknown>>;
  table: string;
  columns: readonly string[];
  databaseUrl: string;
  forceLoader?: 'createMany' | 'COPY';
}

export async function autoLoad(opts: AutoLoadOptions): Promise<BulkLoadResult> {
  const useCopy =
    opts.forceLoader === 'COPY' || (opts.forceLoader !== 'createMany' && opts.rows.length >= 1000);
  if (useCopy) {
    const r = await copyLoad({
      table: opts.table,
      columns: opts.columns,
      rows: opts.rows.map((row) => opts.columns.map((c) => row[c])),
      databaseUrl: opts.databaseUrl,
    });
    return {
      rowsLoaded: r.rowsCopied,
      durationMs: r.durationMs,
      rowsPerSecond: r.rowsPerSecond,
      loaderUsed: 'COPY',
    };
  }
  const start = performance.now();
  const prisma = new PrismaClient({ datasources: { db: { url: opts.databaseUrl } } });
  try {
    const delegate = (
      prisma as unknown as Record<
        string,
        { createMany: (a: { data: unknown[] }) => Promise<{ count: number }> }
      >
    )[opts.table];
    if (!delegate) throw new Error(`[bulk-loader] No Prisma delegate for table "${opts.table}"`);
    const res = await delegate.createMany({ data: opts.rows });
    const durationMs = Math.round(performance.now() - start);
    return {
      rowsLoaded: res.count,
      durationMs,
      rowsPerSecond: Math.round((res.count / durationMs) * 1000),
      loaderUsed: 'createMany',
    };
  } finally {
    await prisma.$disconnect();
  }
}
