// ═══════════════════════════════════════════════════════════════
// CSV EXPORTER — RFC 4180 compliant, Excel-friendly UTF-8 BOM
// ═══════════════════════════════════════════════════════════════

import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { AnonymizationEngine, type ComplianceProfile } from '../anonymization';
import type { ExportOptions, ExportResult } from './exporter.types';

const BOM = '\uFEFF';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  const needsQuote = /[",\n\r]/.test(str);
  return needsQuote ? `"${str.replace(/"/g, '""')}"` : str;
}

export interface CsvExportOptions extends ExportOptions {
  readonly format: 'CSV';
  readonly tableName: string;
  readonly anonymizeProfile?: ComplianceProfile;
  readonly includeBom?: boolean;
}

export class CsvExporter {
  constructor(private readonly prisma: PrismaClient) {}

  async export(opts: CsvExportOptions): Promise<ExportResult> {
    const start = Date.now();
    const engine = opts.anonymize ? new AnonymizationEngine(opts.anonymizeProfile ?? 'DPDP') : null;

    await mkdir(path.dirname(opts.outputPath), { recursive: true });
    const stream = createWriteStream(opts.outputPath, { encoding: 'utf-8' });
    const hasher = createHash('sha256');

    const rows = await this.fetchTable(opts.tableName);
    const processed = engine ? (await engine.anonymizeRecords(opts.tableName, rows)).records : rows;
    if (processed.length === 0) {
      await new Promise<void>((r) => stream.end(() => r()));
      return {
        success: true,
        outputPath: opts.outputPath,
        rowsExported: 0,
        bytesWritten: 0,
        durationMs: Date.now() - start,
        contentHash: '',
      };
    }

    const headers = Object.keys(processed[0]!);
    const lines: string[] = [];
    if (opts.includeBom !== false) lines.push(BOM);
    lines.push(`${headers.join(',')}\n`);

    let bytesWritten = 0;
    for (const line of lines) {
      stream.write(line);
      hasher.update(line);
      bytesWritten += Buffer.byteLength(line);
    }

    let rowsExported = 0;
    for (const row of processed) {
      const line = `${headers.map((h) => escapeCsv((row as Record<string, unknown>)[h])).join(',')}\n`;
      if (!stream.write(line)) await new Promise<void>((r) => stream.once('drain', () => r()));
      hasher.update(line);
      bytesWritten += Buffer.byteLength(line);
      rowsExported++;
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
  }

  private async fetchTable(tableName: string): Promise<readonly Record<string, unknown>[]> {
    const model = (
      this.prisma as unknown as Record<
        string,
        { findMany?: () => Promise<Record<string, unknown>[]> }
      >
    )[tableName];
    return model?.findMany ? model.findMany() : [];
  }
}
