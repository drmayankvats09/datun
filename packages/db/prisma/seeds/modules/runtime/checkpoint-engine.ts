// ═══════════════════════════════════════════════════════════════
// CHECKPOINT ENGINE — Mid-run state persistence for resume
// Pattern: Temporal Event History — replay from last checkpoint
// ═══════════════════════════════════════════════════════════════

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@prisma/client';
import type { ModuleCheckpoint } from '../core/module.types';

export class CheckpointEngine {
  private readonly checkpointDir: string;

  constructor(_prisma: PrismaClient, checkpointDir: string = './seeds/checkpoints') {
    this.checkpointDir = checkpointDir;
  }

  async save(checkpoint: ModuleCheckpoint): Promise<void> {
    await fs.mkdir(this.checkpointDir, { recursive: true });
    const filepath = path.join(this.checkpointDir, `${checkpoint.runId}.checkpoint.json`);
    await fs.writeFile(filepath, JSON.stringify(checkpoint, null, 2));
  }

  async loadLatestCheckpoint(runId: string): Promise<ModuleCheckpoint | null> {
    const filepath = path.join(this.checkpointDir, `${runId}.checkpoint.json`);
    try {
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content) as ModuleCheckpoint;
    } catch {
      return null;
    }
  }

  async list(): Promise<readonly string[]> {
    try {
      const files = await fs.readdir(this.checkpointDir);
      return files
        .filter((f) => f.endsWith('.checkpoint.json'))
        .map((f) => f.replace('.checkpoint.json', ''));
    } catch {
      return [];
    }
  }

  async delete(runId: string): Promise<void> {
    const filepath = path.join(this.checkpointDir, `${runId}.checkpoint.json`);
    try {
      await fs.unlink(filepath);
    } catch {
      /* idempotent */
    }
  }

  async cleanup(olderThanDays: number = 7): Promise<number> {
    const files = await this.list();
    let deleted = 0;
    const cutoff = Date.now() - olderThanDays * 86400000;
    for (const runId of files) {
      const filepath = path.join(this.checkpointDir, `${runId}.checkpoint.json`);
      try {
        const stat = await fs.stat(filepath);
        if (stat.mtimeMs < cutoff) {
          await fs.unlink(filepath);
          deleted++;
        }
      } catch {
        /* skip */
      }
    }
    return deleted;
  }
}
