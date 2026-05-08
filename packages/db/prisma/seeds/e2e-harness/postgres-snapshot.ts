// ═══════════════════════════════════════════════════════════════
// TESTCONTAINERS POSTGRES — snapshot/restore per-test
// CRITICAL: db name MUST NOT be "postgres" (snapshot logic requires it)
// Source: node.testcontainers.org/modules/postgresql/
// ═══════════════════════════════════════════════════════════════

import type { StartedTestContainer } from 'testcontainers';

export interface TestPostgresHandle {
  readonly connectionString: string;
  readonly container: StartedTestContainer;
  snapshot(name?: string): Promise<void>;
  restore(name?: string): Promise<void>;
  stop(): Promise<void>;
}

const DEFAULT_DB = 'datun_test';
const DEFAULT_USER = 'datun_test_user';
const DEFAULT_PASS = 'datun_test_pass';
const SNAPSHOT_NAME = 'datun_e2e_snapshot';

export async function startTestPostgres(
  opts: { image?: string; dbName?: string } = {},
): Promise<TestPostgresHandle> {
  const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
  const dbName = opts.dbName ?? DEFAULT_DB;
  if (dbName === 'postgres')
    throw new Error('Cannot use "postgres" as test database name (snapshot logic requires it)');

  const container = await new PostgreSqlContainer(opts.image ?? 'postgres:18-alpine')
    .withDatabase(dbName)
    .withUsername(DEFAULT_USER)
    .withPassword(DEFAULT_PASS)
    .start();

  const connectionString = `postgresql://${DEFAULT_USER}:${DEFAULT_PASS}@${container.getHost()}:${container.getMappedPort(5432)}/${dbName}`;

  return {
    connectionString,
    container,
    async snapshot(name = SNAPSHOT_NAME) {
      await container.exec([
        'psql',
        '-U',
        DEFAULT_USER,
        '-d',
        'postgres',
        '-c',
        `DROP DATABASE IF EXISTS ${name}`,
      ]);
      await container.exec([
        'psql',
        '-U',
        DEFAULT_USER,
        '-d',
        'postgres',
        '-c',
        `CREATE DATABASE ${name} TEMPLATE ${dbName}`,
      ]);
    },
    async restore(name = SNAPSHOT_NAME) {
      await container.exec([
        'psql',
        '-U',
        DEFAULT_USER,
        '-d',
        'postgres',
        '-c',
        `DROP DATABASE IF EXISTS ${dbName}`,
      ]);
      await container.exec([
        'psql',
        '-U',
        DEFAULT_USER,
        '-d',
        'postgres',
        '-c',
        `CREATE DATABASE ${dbName} TEMPLATE ${name}`,
      ]);
    },
    async stop() {
      await container.stop();
    },
  };
}
