// ═══════════════════════════════════════════════════════════════
// ANONYMIZED DUMP EXPORTER — full DB dump with PII masking
// Pipeline: pg_dump → anonymizer → gzip → S3 upload
// Pattern: nixs/nxs-data-anonymizer (GitHub) staging-refresh
// ═══════════════════════════════════════════════════════════════

import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type { ComplianceProfile } from '../anonymization';
import { JsonlExporter } from './jsonl-exporter';
import { compressFile, type CompressionAlgorithm } from './compression';
import { uploadToS3 } from './s3-streamer';
import { writeManifest } from './manifest-writer';
import type { ExportResult } from './exporter.types';

export interface AnonymizedDumpOptions {
  readonly outputPath: string;
  readonly compliance: ComplianceProfile;
  readonly compression?: CompressionAlgorithm;
  readonly s3Bucket?: string;
  readonly s3Prefix?: string;
  readonly tables?: readonly string[];
}

export class AnonymizedDumpExporter {
  constructor(private readonly prisma: PrismaClient) {}

  async export(
    opts: AnonymizedDumpOptions,
  ): Promise<ExportResult & { s3Url?: string; manifestPath: string }> {
    const start = Date.now();

    // Phase 1: JSONL export with anonymization
    const jsonl = new JsonlExporter(this.prisma);
    const jsonlResult = await jsonl.export({
      format: 'JSONL',
      outputPath: opts.outputPath,
      anonymize: true,
      anonymizeProfile: opts.compliance,
      tables: opts.tables,
    });
    if (!jsonlResult.success) {
      return { ...jsonlResult, manifestPath: '', durationMs: Date.now() - start };
    }

    // Phase 2: Compression
    let finalPath = opts.outputPath;
    let finalBytes = jsonlResult.bytesWritten;
    if (opts.compression && opts.compression !== 'none') {
      const compressed = await compressFile(opts.outputPath, opts.compression, {
        deleteOriginal: true,
      });
      finalPath = compressed.outputPath;
      finalBytes = compressed.compressedBytes;
    }

    // Phase 3: Manifest
    const manifestPath = await writeManifest({
      exportPath: finalPath,
      bytesWritten: finalBytes,
      rowsExported: jsonlResult.rowsExported,
      contentHash: jsonlResult.contentHash,
      compliance: opts.compliance,
      compression: opts.compression ?? 'none',
      tables: opts.tables ?? [],
      generatedAt: new Date().toISOString(),
    });

    // Phase 4: S3 upload (optional)
    let s3Url: string | undefined;
    if (opts.s3Bucket) {
      const key = `${opts.s3Prefix ?? 'datun-exports'}/${path.basename(finalPath)}`;
      const upl = await uploadToS3({
        bucket: opts.s3Bucket,
        key,
        localPath: finalPath,
        storageClass: 'STANDARD_IA',
        serverSideEncryption: true,
      });
      if (upl.success) s3Url = `s3://${opts.s3Bucket}/${key}`;
    }

    return {
      success: true,
      outputPath: finalPath,
      rowsExported: jsonlResult.rowsExported,
      bytesWritten: finalBytes,
      durationMs: Date.now() - start,
      contentHash: jsonlResult.contentHash,
      manifestPath,
      ...(s3Url ? { s3Url } : {}),
    };
  }
}
