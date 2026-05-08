// ═══════════════════════════════════════════════════════════════
// SNAPSHOT ENGINE — Save/restore factory output for fast iterations
//
// Pattern: pg_dump-style logical snapshot of seeded data.
// Use case: "demo" environment seeded once → snapshot → restore in 5s
// instead of 5 min re-seed.
// ═══════════════════════════════════════════════════════════════

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';

export interface SnapshotMetadata {
  readonly snapshotId: string;
  readonly createdAt: string;
  readonly schemaVersion: string;
  readonly recordCounts: Readonly<Record<string, number>>;
  readonly contentHash: string;
}

export class SnapshotEngine {
  constructor(
    private prisma: PrismaClient,
    private snapshotDir: string = './seeds/snapshots',
  ) {}

  /** Save current DB state to snapshot file */
  async save(snapshotName: string, tables: readonly string[]): Promise<SnapshotMetadata> {
    await fs.mkdir(this.snapshotDir, { recursive: true });

    const data: Record<string, unknown[]> = {};
    const recordCounts: Record<string, number> = {};

    for (const table of tables) {
      const model = (
        this.prisma as unknown as Record<string, { findMany: () => Promise<unknown[]> }>
      )[table];
      if (!model) continue;
      const rows = await model.findMany();
      data[table] = rows;
      recordCounts[table] = rows.length;
    }

    const snapshotId = `snap-${Date.now()}-${snapshotName}`;
    const contentHash = createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .slice(0, 16);

    const metadata: SnapshotMetadata = {
      snapshotId,
      createdAt: new Date().toISOString(),
      schemaVersion: '2.1.0',
      recordCounts,
      contentHash,
    };

    const filepath = path.join(this.snapshotDir, `${snapshotName}.snap.json`);
    await fs.writeFile(filepath, JSON.stringify({ metadata, data }, null, 2));

    return metadata;
  }

  /** Restore DB state from snapshot */
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
      // Truncate in reverse order (leafs before parents)
      const tables = Object.keys(data).reverse();
      for (const table of tables) {
        const model = (
          this.prisma as unknown as Record<
            string,
            { deleteMany: (args: { where: object }) => Promise<{ count: number }> }
          >
        )[table];
        if (model) await model.deleteMany({ where: {} });
      }
    }

    // Restore in original order (parents before children)
    for (const [table, rows] of Object.entries(data)) {
      const model = (
        this.prisma as unknown as Record<
          string,
          {
            createMany: (args: {
              data: unknown[];
              skipDuplicates: boolean;
            }) => Promise<{ count: number }>;
          }
        >
      )[table];
      if (model && rows.length > 0) {
        await model.createMany({ data: rows, skipDuplicates: true });
      }
    }

    return metadata;
  }

  /** List all available snapshots */
  async list(): Promise<readonly string[]> {
    try {
      const files = await fs.readdir(this.snapshotDir);
      return files.filter((f) => f.endsWith('.snap.json')).map((f) => f.replace('.snap.json', ''));
    } catch {
      return [];
    }
  }

  /** Delete a snapshot */
  async delete(snapshotName: string): Promise<void> {
    const filepath = path.join(this.snapshotDir, `${snapshotName}.snap.json`);
    await fs.unlink(filepath);
  }
}
