// ═══════════════════════════════════════════════════════════════
// REAL COPY LOADER — pg-copy-streams, no fallback
// 1M rows in ~3 sec on PG18 vs ~5min on createMany (Citus benchmark)
// ═══════════════════════════════════════════════════════════════
import { Pool } from 'pg';
import copyFrom from 'pg-copy-streams';
import { Readable, pipeline } from 'node:stream';
import { promisify } from 'node:util';

const pipelineAsync = promisify(pipeline);

export interface CopyLoadOptions {
  table: string;
  columns: readonly string[];
  /** Each item is a tuple matching `columns` order */
  rows: Iterable<readonly unknown[]>;
  databaseUrl: string;
  batchSize?: number;
}

export interface CopyLoadResult {
  rowsCopied: number;
  durationMs: number;
  rowsPerSecond: number;
}

export async function copyLoad(opts: CopyLoadOptions): Promise<CopyLoadResult> {
  const start = performance.now();
  const pool = new Pool({ connectionString: opts.databaseUrl, max: 1 });
  const client = await pool.connect();
  let rowsCopied = 0;
  try {
    const colList = opts.columns.map((c) => `"${c}"`).join(',');
    const stream = client.query(
      copyFrom.from(`COPY "${opts.table}" (${colList}) FROM STDIN WITH (FORMAT csv, NULL '\\N')`),
    );
    const source = Readable.from(
      (async function* () {
        for (const row of opts.rows) {
          yield encodeCsvRow(row) + '\n';
          rowsCopied++;
        }
      })(),
    );
    await pipelineAsync(source, stream);
  } finally {
    client.release();
    await pool.end();
  }
  const durationMs = Math.round(performance.now() - start);
  return { rowsCopied, durationMs, rowsPerSecond: Math.round((rowsCopied / durationMs) * 1000) };
}

function encodeCsvRow(row: readonly unknown[]): string {
  return row
    .map((v) => {
      if (v === null || v === undefined) return '\\N';
      if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`;
      if (v instanceof Date) return `"${v.toISOString()}"`;
      if (typeof v === 'object') return `"${JSON.stringify(v).replace(/"/g, '""')}"`;
      return String(v);
    })
    .join(',');
}
