/**
 * simulate-rollback.ts — verify ROLLBACK.sql actually reverses the migration.
 *
 * Procedure:
 *   1. Connect to shadow DB (must be empty)
 *   2. Capture pre-state schema fingerprint
 *   3. Apply migration.sql forward
 *   4. Capture post-state schema fingerprint
 *   5. Apply ROLLBACK.sql
 *   6. Capture rollback-state schema fingerprint
 *   7. Verify pre-state ≡ rollback-state
 *
 * Catches: ROLLBACK.sql that drops the wrong tables, misses indexes, etc.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

async function dumpSchemaSignature(client: Client): Promise<string> {
  const tablesRes = await client.query<{
    table_name: string;
    column_name: string;
    data_type: string;
  }>(
    `SELECT table_name, column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public'
     ORDER BY table_name, ordinal_position`,
  );
  const indexesRes = await client.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname`,
  );
  return JSON.stringify({
    columns: tablesRes.rows,
    indexes: indexesRes.rows.map((r) => r.indexname),
  });
}

async function applySql(client: Client, sql: string): Promise<void> {
  // Split on semicolons but preserve dollar-quoted blocks (good enough for migrations)
  await client.query(sql);
}

async function main(): Promise<number> {
  const folder = process.argv[2];
  if (!folder) {
    console.error('Usage: tsx simulate-rollback.ts <migration-folder>');
    return 1;
  }
  const forwardPath = join(folder, 'migration.sql');
  const rollbackPath = join(folder, 'ROLLBACK.sql');
  if (!existsSync(forwardPath) || !existsSync(rollbackPath)) {
    console.error(`Missing migration.sql or ROLLBACK.sql in ${folder}`);
    return 1;
  }

  const url = process.env.SHADOW_DATABASE_URL;
  if (!url) {
    console.error('SHADOW_DATABASE_URL not set.');
    return 2;
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  try {
    console.log('Capturing pre-state...');
    const preSig = await dumpSchemaSignature(client);

    console.log('Applying forward migration...');
    await applySql(client, readFileSync(forwardPath, 'utf8'));
    const postSig = await dumpSchemaSignature(client);

    if (preSig === postSig) {
      console.error('✗ Forward migration changed nothing — invalid test setup');
      return 1;
    }

    console.log('Applying ROLLBACK.sql...');
    await applySql(client, readFileSync(rollbackPath, 'utf8'));
    const rollbackSig = await dumpSchemaSignature(client);

    const passed = preSig === rollbackSig;
    if (passed) {
      console.log('✓ Rollback restores pre-state correctly');
      return 0;
    } else {
      console.error('✗ ROLLBACK.sql does NOT restore pre-state');
      console.error('Pre-state signature:', preSig.slice(0, 200), '...');
      console.error('Rollback signature:', rollbackSig.slice(0, 200), '...');
      return 1;
    }
  } finally {
    await client.end();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('simulate-rollback crashed:', err);
    process.exit(2);
  });
