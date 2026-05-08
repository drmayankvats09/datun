// ═══════════════════════════════════════════════════════════════
// DB POOL EXHAUSTION TEST — Hermetic via Testcontainers
//
// Validates Prisma's connection pool behavior under load.
// Uses ephemeral Postgres container (Testcontainers) — no template
// database, no shared state, no flakes from concurrent test runs.
//
// FAANG pattern: hermetic tests > shared fixtures.
// Reference: https://testcontainers.com/guides/getting-started-with-testcontainers-for-nodejs/
//
// SKIP CONDITION: This test requires Docker (Testcontainers backend).
// On developer machines without Docker, the test is gracefully skipped.
// CI environments with Docker available run the full hermetic suite.
//
// To force-run on a Docker-enabled machine:
//   $env:RUN_DOCKER_TESTS = "1"; pnpm test
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';

// ─── Skip condition: gracefully no-op when Docker is unavailable ────────
// FAANG: tests requiring infra dependencies should auto-skip on dev machines
// to keep the unit-test loop fast. CI explicitly opts in via RUN_DOCKER_TESTS=1.
const skipNoDocker = process.env.RUN_DOCKER_TESTS !== '1';

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;

describe.skipIf(skipNoDocker)('DB connection pool exhaustion', () => {
  beforeAll(async () => {
    // Spin up ephemeral Postgres 18 container
    container = await new PostgreSqlContainer('postgres:18-alpine')
      .withDatabase('datun_pool_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    const url = container.getConnectionUri();

    // Run migrations against the ephemeral DB
    execSync(`pnpm exec prisma migrate deploy`, {
      env: { ...process.env, DATABASE_URL: url },
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    // Connect Prisma client with explicit pool size of 10
    prisma = new PrismaClient({
      datasources: { db: { url: `${url}?connection_limit=10&pool_timeout=5` } },
    });

    await prisma.$connect();
  }, 180_000); // 3-min timeout for container pull + migrations on first run

  afterAll(async () => {
    try {
      await prisma?.$disconnect();
    } catch {
      // already disconnected
    }
    try {
      await container?.stop();
    } catch {
      // already stopped
    }
  });

  it('handles 100 concurrent queries against pool of 10 without crash', async () => {
    // FAANG invariant: Prisma queues queries when pool is exhausted.
    // 100 simultaneous SELECT 1 should ALL succeed (queued + reused),
    // not throw, not deadlock.
    const queries = Array.from({ length: 100 }, () => prisma.$queryRaw`SELECT 1 as result`);

    const results = await Promise.all(queries);
    expect(results).toHaveLength(100);
    expect(results.every((r: unknown) => (r as Array<{ result: number }>)[0]?.result === 1)).toBe(
      true,
    );
  }, 30_000);

  it('reports clean error when pool_timeout exceeded', async () => {
    // Spawn long-running queries to exhaust the pool, then attempt one more
    // with a short timeout — Prisma should throw a clean PoolTimeoutError.
    const longQueries = Array.from(
      { length: 10 },
      () => prisma.$queryRaw`SELECT pg_sleep(10)`, // each holds connection 10s
    );

    // Don't await — keep them running
    Promise.all(longQueries).catch(() => {
      /* expected to be aborted */
    });

    // Wait briefly for pool to fill
    await new Promise((r) => setTimeout(r, 500));

    // This should fail with pool timeout (we set pool_timeout=5)
    await expect(async () => {
      await prisma.$queryRaw`SELECT 1`;
    }).rejects.toThrow(/timeout|pool|connection/i);
  }, 15_000);
});
