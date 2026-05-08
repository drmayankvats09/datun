// ═══════════════════════════════════════════════════════════════
// LOADER CONTRACT — interface every bulk loader satisfies
// ═══════════════════════════════════════════════════════════════
export interface BulkLoadResult {
  rowsLoaded: number;
  durationMs: number;
  rowsPerSecond: number;
  loaderUsed: 'COPY' | 'createMany' | 'unloggedTable' | 'parquet-staging';
}

export interface BulkLoader<TRow> {
  readonly name: string;
  readonly threshold: number; // row count above which this loader is preferred
  load(rows: TRow[], opts: { table: string; databaseUrl: string }): Promise<BulkLoadResult>;
}
