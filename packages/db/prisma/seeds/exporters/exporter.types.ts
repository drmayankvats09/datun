// ═══════════════════════════════════════════════════════════════
// EXPORTER TYPES — common contract across all exporters
// ═══════════════════════════════════════════════════════════════

export type ExportFormat =
  | 'JSONL'
  | 'CSV'
  | 'PARQUET'
  | 'PG_DUMP'
  | 'BIGQUERY'
  | 'OPENAI_FT'
  | 'ARCHIVE';

export interface ExportOptions {
  readonly format: ExportFormat;
  readonly outputPath: string;
  readonly anonymize: boolean;
  readonly compression?: 'gzip' | 'zstd' | 'none';
  readonly chunkSize?: number;
  readonly tables?: readonly string[];
  readonly s3Bucket?: string;
  readonly s3Prefix?: string;
}

export interface ExportResult {
  readonly success: boolean;
  readonly outputPath: string;
  readonly rowsExported: number;
  readonly bytesWritten: number;
  readonly compressionRatio?: number;
  readonly durationMs: number;
  readonly contentHash: string;
  readonly manifestPath?: string;
  readonly error?: string;
}

export interface ExportProgress {
  readonly phase: 'INIT' | 'EXPORTING' | 'COMPRESSING' | 'UPLOADING' | 'COMPLETE';
  readonly currentTable?: string;
  readonly tablesDone: number;
  readonly totalTables: number;
  readonly rowsDone: number;
  readonly bytesWritten: number;
}
