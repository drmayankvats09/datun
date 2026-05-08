// ═══════════════════════════════════════════════════════════════
// MANIFEST WRITER — sidecar JSON describing each export
// ═══════════════════════════════════════════════════════════════

import { writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface ExportManifest {
  readonly exportPath: string;
  readonly bytesWritten: number;
  readonly rowsExported: number;
  readonly contentHash: string;
  readonly compliance: string;
  readonly compression: string;
  readonly tables: readonly string[];
  readonly generatedAt: string;
  readonly generatedBy?: string;
  readonly schemaVersion?: string;
  readonly retentionDays?: number;
  readonly classification?: 'public' | 'internal' | 'confidential' | 'restricted';
}

export async function writeManifest(manifest: ExportManifest): Promise<string> {
  const manifestPath = `${manifest.exportPath}.manifest.json`;
  const enriched = {
    ...manifest,
    schemaVersion: manifest.schemaVersion ?? '1.0',
    classification: manifest.classification ?? 'restricted',
    retentionDays: manifest.retentionDays ?? 90,
    generatedBy: manifest.generatedBy ?? `datun-seed-cli@${process.version}`,
  };
  await writeFile(manifestPath, JSON.stringify(enriched, null, 2));
  return manifestPath;
}

export async function writeArchiveManifest(
  bundlePath: string,
  contents: readonly { path: string; bytes: number; hash: string }[],
): Promise<string> {
  const manifestPath = `${bundlePath}.archive.json`;
  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        bundlePath: path.basename(bundlePath),
        generatedAt: new Date().toISOString(),
        contents,
        totalFiles: contents.length,
        totalBytes: contents.reduce((s, c) => s + c.bytes, 0),
      },
      null,
      2,
    ),
  );
  return manifestPath;
}
