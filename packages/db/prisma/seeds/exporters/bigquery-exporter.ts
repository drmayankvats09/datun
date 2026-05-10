// ═══════════════════════════════════════════════════════════════
// BIGQUERY EXPORTER — JSONL → GCS → BQ load job
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import { JsonlExporter } from './jsonl-exporter';
import type { ExportResult } from './exporter.types';

export interface BigQueryExportOptions {
  readonly outputPath: string;
  readonly gcsBucket: string;
  readonly bqDataset: string;
  readonly bqTablePrefix: string;
  readonly anonymize?: boolean;
  readonly tables?: readonly string[];
}

export class BigQueryExporter {
  constructor(private readonly prisma: PrismaClient) {}

  async export(
    opts: BigQueryExportOptions,
  ): Promise<ExportResult & { gcsUri?: string; bqLoadCommand: string }> {
    const start = Date.now();

    const jsonl = new JsonlExporter(this.prisma);
    const result = await jsonl.export({
      format: 'JSONL',
      outputPath: opts.outputPath,
      anonymize: opts.anonymize ?? true,
      tables: opts.tables,
    });

    const gcsUri = `gs://${opts.gcsBucket}/datun/${new Date().toISOString().slice(0, 10)}/export.jsonl`;
    const bqLoadCommand = `bq load --source_format=NEWLINE_DELIMITED_JSON --autodetect ${opts.bqDataset}.${opts.bqTablePrefix}_$(date +%Y%m%d) ${gcsUri}`;

    return {
      ...result,
      gcsUri,
      bqLoadCommand,
      durationMs: Date.now() - start,
    };
  }
}
