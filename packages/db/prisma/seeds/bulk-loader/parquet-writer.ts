// ═══════════════════════════════════════════════════════════════
// REAL PARQUET — @dsnp/parquetjs, no fallback
// BigQuery + Athena + Snowflake compatible (snappy compression)
// ═══════════════════════════════════════════════════════════════
import * as parquet from '@dsnp/parquetjs';

export type ParquetField = 'UTF8' | 'INT64' | 'BOOLEAN' | 'TIMESTAMP_MILLIS' | 'DOUBLE';

export interface ParquetSchema {
  [field: string]: { type: ParquetField; optional?: boolean };
}

export interface ParquetWriteOptions {
  outputPath: string;
  schema: ParquetSchema;
  rows: AsyncIterable<Record<string, unknown>>;
  compression?: 'SNAPPY' | 'GZIP' | 'UNCOMPRESSED';
  rowGroupSize?: number;
}

export async function writeParquet(
  opts: ParquetWriteOptions,
): Promise<{ rowsWritten: number; bytesWritten: number; durationMs: number }> {
  const start = performance.now();
  const schema = new parquet.ParquetSchema(
    Object.fromEntries(
      Object.entries(opts.schema).map(([k, v]) => [
        k,
        { type: v.type, optional: v.optional ?? false, compression: opts.compression ?? 'SNAPPY' },
      ]),
    ),
  );
  const writer = await parquet.ParquetWriter.openFile(schema, opts.outputPath, {
    rowGroupSize: opts.rowGroupSize ?? 4096,
  });
  let rowsWritten = 0;
  for await (const row of opts.rows) {
    await writer.appendRow(row);
    rowsWritten++;
  }
  await writer.close();
  const { size: bytesWritten } = await import('node:fs/promises').then((fs) =>
    fs.stat(opts.outputPath),
  );
  return { rowsWritten, bytesWritten, durationMs: Math.round(performance.now() - start) };
}

export async function readParquet(filePath: string): Promise<unknown[]> {
  const reader = await parquet.ParquetReader.openFile(filePath);
  const cursor = reader.getCursor();
  const rows: unknown[] = [];
  let r: unknown;
  while ((r = await cursor.next())) rows.push(r);
  await reader.close();
  return rows;
}
