import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { PrismaClient } from '@prisma/client';
import { CheckpointEngine } from '../../../../prisma/seeds/modules/runtime/checkpoint-engine';

describe('CheckpointEngine', () => {
  let tempDir: string;
  let engine: CheckpointEngine;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'checkpoint-test-'));
    engine = new CheckpointEngine({} as unknown as PrismaClient, tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('saves and loads checkpoint', async () => {
    const cp = {
      moduleName: 'test',
      runId: 'run-1',
      batchIndex: 5,
      recordsProcessed: 1000,
      registrySnapshot: { foo: 'bar' },
      checkpointedAt: new Date(),
    };
    await engine.save(cp);
    const loaded = await engine.loadLatestCheckpoint('run-1');
    expect(loaded?.runId).toBe('run-1');
    expect(loaded?.recordsProcessed).toBe(1000);
  });

  it('returns null for non-existent checkpoint', async () => {
    const loaded = await engine.loadLatestCheckpoint('does-not-exist');
    expect(loaded).toBeNull();
  });

  it('lists checkpoints', async () => {
    await engine.save({
      moduleName: 't',
      runId: 'r1',
      batchIndex: 0,
      recordsProcessed: 0,
      registrySnapshot: {},
      checkpointedAt: new Date(),
    });
    await engine.save({
      moduleName: 't',
      runId: 'r2',
      batchIndex: 0,
      recordsProcessed: 0,
      registrySnapshot: {},
      checkpointedAt: new Date(),
    });
    const list = await engine.list();
    expect(list).toContain('r1');
    expect(list).toContain('r2');
  });

  it('deletes checkpoint', async () => {
    await engine.save({
      moduleName: 't',
      runId: 'to-delete',
      batchIndex: 0,
      recordsProcessed: 0,
      registrySnapshot: {},
      checkpointedAt: new Date(),
    });
    await engine.delete('to-delete');
    const loaded = await engine.loadLatestCheckpoint('to-delete');
    expect(loaded).toBeNull();
  });
});
