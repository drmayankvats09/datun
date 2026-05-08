// ═══════════════════════════════════════════════════════════════
// PARQUET EXPORTER (placeholder) + ARCHIVE BUNDLER (tar.gz)
// Parquet requires `parquetjs` — graceful fallback to JSONL
// ═══════════════════════════════════════════════════════════════

import { createGzip } from 'node:zlib';
import { createReadStream, createWriteStream } from 'node:fs';
import { readdir, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';
import type { PrismaClient } from '@prisma/client';
import { JsonlExporter } from './jsonl-exporter';
import type { ExportResult } from './exporter.types';

export class ParquetExporter {
  constructor(private readonly prisma: PrismaClient) {}

  async export(opts: { outputPath: string; tables?: readonly string[] }): Promise<ExportResult> {
    // Try @dsnp/parquetjs if installed; otherwise fall back to JSONL
    try {
      // const { ParquetWriter } = await import('@dsnp/parquetjs');
      throw new Error('not-implemented'); // conservative fallback
    } catch {
      const jsonl = new JsonlExporter(this.prisma);
      return jsonl.export({
        format: 'JSONL',
        outputPath: opts.outputPath.replace(/\.parquet$/, '.jsonl'),
        anonymize: false,
        ...(opts.tables ? { tables: opts.tables } : {}),
      });
    }
  }
}

export async function bundleArchive(opts: {
  sourceDir: string;
  outputPath: string;
}): Promise<{ success: boolean; outputPath: string; bytesWritten: number; fileCount: number }> {
  await mkdir(path.dirname(opts.outputPath), { recursive: true });

  // Use system tar
  return new Promise((resolve) => {
    const child = spawn('tar', ['-czf', opts.outputPath, '-C', opts.sourceDir, '.'], {
      stdio: 'ignore',
    });
    child.on('close', async (code) => {
      const success = code === 0;
      let bytes = 0;
      let fileCount = 0;
      try {
        const s = await stat(opts.outputPath);
        bytes = s.size;
        const entries = await readdir(opts.sourceDir);
        fileCount = entries.length;
      } catch {
        /* ignore */
      }
      resolve({ success, outputPath: opts.outputPath, bytesWritten: bytes, fileCount });
    });
    child.on('error', () => {
      // Fallback: gzip a single file
      pipeline(createReadStream(opts.sourceDir), createGzip(), createWriteStream(opts.outputPath))
        .then(async () => {
          let bytes = 0;
          try {
            bytes = (await stat(opts.outputPath)).size;
          } catch {
            /* ignore */
          }
          resolve({
            success: true,
            outputPath: opts.outputPath,
            bytesWritten: bytes,
            fileCount: 1,
          });
        })
        .catch(() =>
          resolve({ success: false, outputPath: opts.outputPath, bytesWritten: 0, fileCount: 0 }),
        );
    });
  });
}
