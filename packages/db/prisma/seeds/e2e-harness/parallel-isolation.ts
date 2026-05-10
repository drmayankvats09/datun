// ═══════════════════════════════════════════════════════════════
// PARALLEL ISOLATION — schema-per-worker pattern for parallel test runs
// Source: douglasgoulart.com — random schema name per Vitest worker
// ═══════════════════════════════════════════════════════════════

import { randomUUID } from 'node:crypto';

export interface IsolatedSchemaHandle {
  readonly schemaName: string;
  readonly connectionString: string;
}

export function buildIsolatedSchema(baseConnectionString: string): IsolatedSchemaHandle {
  const schemaName = `test_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const url = new URL(baseConnectionString);
  url.searchParams.set('schema', schemaName);
  return { schemaName, connectionString: url.toString() };
}

export async function dropSchema(connectionString: string, schemaName: string): Promise<void> {
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  } finally {
    await client.end();
  }
}
