// ═══════════════════════════════════════════════════════════════
// JSONL EXPORTER — NDJSON streaming, BigQuery + OpenAI compatible
// Source: ndjson.com — line-by-line, memory-efficient
// ═══════════════════════════════════════════════════════════════

import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { AnonymizationEngine, type ComplianceProfile } from '../anonymization';
import type { ExportOptions, ExportResult } from './exporter.types';

export interface JsonlExportOptions extends ExportOptions {
  readonly format: 'JSONL';
  readonly anonymizeProfile?: ComplianceProfile;
  readonly batchSize?: number;
}

export class JsonlExporter {
  constructor(private readonly prisma: PrismaClient) {}

  async export(opts: JsonlExportOptions): Promise<ExportResult> {
    const start = Date.now();
    const tables = opts.tables ?? ['patient', 'consultation', 'prescription', 'appointment'];
    const batchSize = opts.batchSize ?? 1000;
    const engine = opts.anonymize ? new AnonymizationEngine(opts.anonymizeProfile ?? 'DPDP') : null;

    await mkdir(path.dirname(opts.outputPath), { recursive: true });
    const stream = createWriteStream(opts.outputPath, { encoding: 'utf-8' });
    const hasher = createHash('sha256');

    let rowsExported = 0;
    let bytesWritten = 0;

    try {
      for (const table of tables) {
        const rows = await this.fetchTable(table);
        const processed = engine ? (await engine.anonymizeRecords(table, rows)).records : rows;
        for (const row of processed) {
          const line = `${JSON.stringify({ _table: table, ...row })}\n`;
          if (!stream.write(line)) await new Promise<void>((r) => stream.once('drain', () => r()));
          hasher.update(line);
          bytesWritten += Buffer.byteLength(line);
          rowsExported++;
        }
        if (rowsExported % batchSize === 0) {
          // Periodic flush hint
          stream.cork();
          stream.uncork();
        }
      }
      await new Promise<void>((resolve, reject) =>
        stream.end((err?: Error | null) => (err ? reject(err) : resolve())),
      );

      return {
        success: true,
        outputPath: opts.outputPath,
        rowsExported,
        bytesWritten,
        durationMs: Date.now() - start,
        contentHash: hasher.digest('hex').slice(0, 16),
      };
    } catch (e) {
      stream.destroy();
      return {
        success: false,
        outputPath: opts.outputPath,
        rowsExported,
        bytesWritten,
        durationMs: Date.now() - start,
        contentHash: '',
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private async fetchTable(tableName: string): Promise<readonly Record<string, unknown>[]> {
    const model = (
      this.prisma as unknown as Record<
        string,
        { findMany?: () => Promise<Record<string, unknown>[]> }
      >
    )[tableName];
    if (!model?.findMany) return [];
    return model.findMany();
  }
}
