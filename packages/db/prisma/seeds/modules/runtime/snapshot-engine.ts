// ═══════════════════════════════════════════════════════════════
// SNAPSHOT ENGINE v2 — pg_dump-style logical snapshot
// Use case: "demo" once seeded → snapshot → restore in seconds
// instead of re-running 6+ minute orchestration.
// ═══════════════════════════════════════════════════════════════

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

export interface SnapshotMetadata {
  readonly snapshotId: string;
  readonly snapshotName: string;
  readonly createdAt: string;
  readonly schemaVersion: string;
  readonly recordCounts: Readonly<Record<string, number>>;
  readonly contentHash: string;
  readonly sizeBytes: number;
}

export class SnapshotEngineV2 {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly snapshotDir: string = './seeds/snapshots',
  ) {}

  async save(snapshotName: string, tables: readonly string[]): Promise<SnapshotMetadata> {
    await fs.mkdir(this.snapshotDir, { recursive: true });

    const data: Record<string, unknown[]> = {};
    const recordCounts: Record<string, number> = {};

    for (const table of tables) {
      const model = (
        this.prisma as unknown as Record<string, { findMany?: () => Promise<unknown[]> }>
      )[table];
      if (!model?.findMany) continue;
      const rows = await model.findMany();
      data[table] = rows;
      recordCounts[table] = rows.length;
    }

    const snapshotId = `snap-${Date.now()}-${snapshotName}`;
    const json = JSON.stringify({ data });
    const contentHash = createHash('sha256').update(json).digest('hex').slice(0, 16);

    const metadata: SnapshotMetadata = {
      snapshotId,
      snapshotName,
      createdAt: new Date().toISOString(),
      schemaVersion: '2.1.0',
      recordCounts,
      contentHash,
      sizeBytes: Buffer.byteLength(json),
    };

    const filepath = path.join(this.snapshotDir, `${snapshotName}.snap.json`);
    await fs.writeFile(filepath, JSON.stringify({ metadata, data }, null, 2));

    return metadata;
  }

  async restore(
    snapshotName: string,
    options: { truncateFirst?: boolean } = {},
  ): Promise<SnapshotMetadata> {
    const filepath = path.join(this.snapshotDir, `${snapshotName}.snap.json`);
    const content = await fs.readFile(filepath, 'utf-8');
    const { metadata, data } = JSON.parse(content) as {
      metadata: SnapshotMetadata;
      data: Record<string, unknown[]>;
    };

    if (options.truncateFirst) {
      const tables = Object.keys(data).reverse();
      for (const t of tables) {
        const model = (
          this.prisma as unknown as Record<
            string,
            { deleteMany?: (args: object) => Promise<unknown> }
          >
        )[t];
        if (model?.deleteMany) await model.deleteMany({ where: {} });
      }
    }

    for (const [t, rows] of Object.entries(data)) {
      const model = (
        this.prisma as unknown as Record<
          string,
          { createMany?: (args: object) => Promise<unknown> }
        >
      )[t];
      if (model?.createMany && rows.length > 0) {
        await model.createMany({ data: rows, skipDuplicates: true });
      }
    }

    return metadata;
  }

  async list(): Promise<readonly SnapshotMetadata[]> {
    try {
      const files = await fs.readdir(this.snapshotDir);
      const snapshotFiles = files.filter((f) => f.endsWith('.snap.json'));
      const result: SnapshotMetadata[] = [];
      for (const f of snapshotFiles) {
        try {
          const content = await fs.readFile(path.join(this.snapshotDir, f), 'utf-8');
          const { metadata } = JSON.parse(content);
          result.push(metadata);
        } catch {
          /* skip corrupt */
        }
      }
      return result;
    } catch {
      return [];
    }
  }

  async delete(snapshotName: string): Promise<void> {
    const filepath = path.join(this.snapshotDir, `${snapshotName}.snap.json`);
    try {
      await fs.unlink(filepath);
    } catch {
      /* idempotent */
    }
  }
}
