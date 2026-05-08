// ═══════════════════════════════════════════════════════════════
// TEST SETUP — Per-suite Postgres testcontainer with template DB
// Source: testcontainers/postgres-module + Sergei Egorov pattern
// ═══════════════════════════════════════════════════════════════
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';
import { afterAll, beforeAll } from 'vitest';

let container: StartedPostgreSqlContainer | null = null;
let templateUrl: string | null = null;

declare global {
  var __TEST_DATABASE_URL__: string | undefined;
  var __TEST_TEMPLATE_DB__: string | undefined;
}

beforeAll(async () => {
  if (process.env.SKIP_TESTCONTAINERS === '1') {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/datun_test';
    return;
  }
  container = await new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('datun_template')
    .withUsername('test')
    .withPassword('test')
    .withReuse()
    .start();
  templateUrl = container.getConnectionUri();
  process.env.DATABASE_URL = templateUrl;
  globalThis.__TEST_DATABASE_URL__ = templateUrl;
  globalThis.__TEST_TEMPLATE_DB__ = 'datun_template';
  // Apply schema once per test run
  execSync('pnpm --filter @repo/db exec prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: templateUrl },
    stdio: 'inherit',
  });
}, 120_000);

afterAll(async () => {
  if (container) {
    await container.stop();
  }
});
