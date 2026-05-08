// ═══════════════════════════════════════════════════════════════
// COMPRESSION ADAPTER — gzip + zstd (when available)
// ═══════════════════════════════════════════════════════════════

import { createGzip } from 'node:zlib';
import { createReadStream, createWriteStream } from 'node:fs';
import { stat, unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';

export type CompressionAlgorithm = 'gzip' | 'zstd' | 'none';

export interface CompressionResult {
  readonly inputPath: string;
  readonly outputPath: string;
  readonly originalBytes: number;
  readonly compressedBytes: number;
  readonly compressionRatio: number;
  readonly durationMs: number;
}

export async function compressFile(
  inputPath: string,
  algorithm: CompressionAlgorithm,
  opts: { deleteOriginal?: boolean; level?: number } = {},
): Promise<CompressionResult> {
  const start = Date.now();
  const originalStat = await stat(inputPath);

  if (algorithm === 'none') {
    return {
      inputPath,
      outputPath: inputPath,
      originalBytes: originalStat.size,
      compressedBytes: originalStat.size,
      compressionRatio: 1,
      durationMs: 0,
    };
  }

  const ext = algorithm === 'gzip' ? '.gz' : '.zst';
  const outputPath = `${inputPath}${ext}`;

  if (algorithm === 'gzip') {
    await pipeline(
      createReadStream(inputPath),
      createGzip({ level: opts.level ?? 6 }),
      createWriteStream(outputPath),
    );
  } else if (algorithm === 'zstd') {
    // zstd requires native binding — fallback to gzip when not available
    try {
      const { compress } = await import('@mongodb-js/zstd');
      const buf = await import('node:fs/promises').then((m) => m.readFile(inputPath));
      const compressed = await compress(buf as Buffer, opts.level ?? 3);
      await import('node:fs/promises').then((m) => m.writeFile(outputPath, compressed));
    } catch {
      // Fallback to gzip
      await pipeline(
        createReadStream(inputPath),
        createGzip({ level: opts.level ?? 6 }),
        createWriteStream(outputPath),
      );
    }
  }

  const compressedStat = await stat(outputPath);
  if (opts.deleteOriginal) await unlink(inputPath);

  return {
    inputPath,
    outputPath,
    originalBytes: originalStat.size,
    compressedBytes: compressedStat.size,
    compressionRatio: compressedStat.size / originalStat.size,
    durationMs: Date.now() - start,
  };
}
