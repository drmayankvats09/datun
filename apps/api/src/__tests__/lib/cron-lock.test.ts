// ═══════════════════════════════════════════════════════════════
// CRON LOCK TESTS — Verify distributed lock behavior
// Tests atomic acquire/release/withCronLock pattern.
// Uses mocked Redis (from setup.ts) — in-memory Map behind scenes.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { acquireCronLock, releaseCronLock, withCronLock } from '../../lib/cron-lock.js';

describe('Distributed Cron Lock', () => {
  beforeEach(async () => {
    // Release any stale locks between tests
    await releaseCronLock('test-job');
    await releaseCronLock('wrapper-job');
  });

  it('first caller acquires lock successfully', async () => {
    const acquired = await acquireCronLock('test-job', 60);
    expect(acquired).toBe(true);
  });

  it('second caller is denied while lock is held', async () => {
    // First caller gets lock
    const first = await acquireCronLock('test-job', 60);
    expect(first).toBe(true);

    // Second caller denied
    const second = await acquireCronLock('test-job', 60);
    expect(second).toBe(false);
  });

  it('lock can be re-acquired after release', async () => {
    // Acquire
    await acquireCronLock('test-job', 60);

    // Release
    await releaseCronLock('test-job');

    // Re-acquire should succeed
    const reacquired = await acquireCronLock('test-job', 60);
    expect(reacquired).toBe(true);
  });

  it('different job names have independent locks', async () => {
    const job1 = await acquireCronLock('job-alpha', 60);
    const job2 = await acquireCronLock('job-beta', 60);

    expect(job1).toBe(true);
    expect(job2).toBe(true);

    // Cleanup
    await releaseCronLock('job-alpha');
    await releaseCronLock('job-beta');
  });

  it('withCronLock wrapper executes handler when lock available', async () => {
    let executed = false;

    const wrappedHandler = withCronLock('wrapper-job', async () => {
      executed = true;
    });

    await wrappedHandler();
    expect(executed).toBe(true);
  });

  it('withCronLock wrapper skips handler when lock held', async () => {
    let executeCount = 0;

    // Manually acquire lock first
    await acquireCronLock('wrapper-job', 60);

    const wrappedHandler = withCronLock('wrapper-job', async () => {
      executeCount++;
    });

    // Should skip because lock already held
    await wrappedHandler();
    expect(executeCount).toBe(0);
  });

  it('withCronLock releases lock even if handler throws', async () => {
    const wrappedHandler = withCronLock('wrapper-job', async () => {
      throw new Error('Job crashed!');
    });

    // Should propagate error but release lock
    await expect(wrappedHandler()).rejects.toThrow('Job crashed!');

    // Lock should be released — next run should acquire
    const reacquired = await acquireCronLock('wrapper-job', 60);
    expect(reacquired).toBe(true);
  });
});
