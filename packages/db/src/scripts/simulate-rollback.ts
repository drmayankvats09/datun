/**
 * simulate-rollback.ts — verify ROLLBACK.sql actually reverses the migration.
 *
 * v2.0 enhancement (2026-05-10):
 *   - Auto-applies all PRIOR migrations to shadow DB before testing target.
 *     This makes ALTER-heavy migrations testable (previously only CREATE-only
 *     migrations worked because shadow started empty).
 *   - Schema signature now includes enum values + foreign keys so enum-only
 *     migrations are correctly detected as "schema-changing".
 *   - Diff output on failure for fast root-cause identification.
 *
 * Procedure:
 *   1. Connect to shadow DB (must start empty)
 *   2. Apply ALL prior migrations to shadow in chronological order
 *   3. Capture pre-state schema fingerprint (after priors, before target)
 *   4. Apply target migration.sql forward
 *   5. Capture post-state schema fingerprint
 *   6. Apply ROLLBACK.sql
 *   7. Capture rollback-state schema fingerprint
 *   8. Verify pre-state ≡ rollback-state
 *
 * Catches: ROLLBACK.sql that drops the wrong tables, misses indexes, leaves
 *          orphan enum values, doesn't restore defaults, etc.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { Client } from 'pg';

interface SchemaSignature {
  columns: Array<{
    table_name: string;
    column_name: string;
    data_type: string;
    udt_name: string;
    is_nullable: string;
    column_default: string | null;
  }>;
  indexes: string[];
  enums: Array<{ enum_name: string; values: string[] }>;
  foreign_keys: string[];
}

async function dumpSchemaSignature(client: Client): Promise<string> {
  const tablesRes = await client.query<{
    table_name: string;
    column_name: string;
    data_type: string;
    udt_name: string;
    is_nullable: string;
    column_default: string | null;
  }>(
    `SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public'
     ORDER BY table_name, ordinal_position`,
  );
  const indexesRes = await client.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname`,
  );
  // Capture enum values too — ALTER TYPE ADD VALUE is invisible in information_schema otherwise
  const enumsRes = await client.query<{ enum_name: string; enum_value: string }>(
    `SELECT t.typname AS enum_name, e.enumlabel AS enum_value
     FROM pg_type t
     JOIN pg_enum e ON t.oid = e.enumtypid
     JOIN pg_namespace n ON n.oid = t.typnamespace
     WHERE n.nspname = 'public'
     ORDER BY t.typname, e.enumsortorder`,
  );
  const enumsByName = new Map<string, string[]>();
  for (const row of enumsRes.rows) {
    if (!enumsByName.has(row.enum_name)) enumsByName.set(row.enum_name, []);
    enumsByName.get(row.enum_name)!.push(row.enum_value);
  }
  const enums = [...enumsByName.entries()]
    .map(([enum_name, values]) => ({ enum_name, values }))
    .sort((a, b) => a.enum_name.localeCompare(b.enum_name));

  const fksRes = await client.query<{ fk: string }>(
    `SELECT conname || ':' || conrelid::regclass::text || '->' || confrelid::regclass::text AS fk
     FROM pg_constraint
     WHERE contype = 'f'
       AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
     ORDER BY conname`,
  );

  const sig: SchemaSignature = {
    columns: tablesRes.rows,
    indexes: indexesRes.rows.map((r) => r.indexname),
    enums,
    foreign_keys: fksRes.rows.map((r) => r.fk),
  };
  return JSON.stringify(sig);
}

async function applySql(client: Client, sql: string): Promise<void> {
  // Postgres can execute multi-statement strings via single query() call.
  // Migrations don't use dollar-quoted procedural blocks so this is safe.
  await client.query(sql);
}

/**
 * Find every prior migration folder (chronologically before target) and apply
 * each migration.sql in order. This brings the shadow DB to the state expected
 * just BEFORE the target migration runs.
 */
async function applyPriorMigrations(client: Client, targetFolder: string): Promise<string[]> {
  const migrationsDir = dirname(targetFolder);
  const targetName = basename(targetFolder);

  const allEntries = readdirSync(migrationsDir, { withFileTypes: true });
  const folders = allEntries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => /^\d{14}_/.test(name) || name === '0_init')
    .sort(); // lexicographic = chronological for our naming convention

  const applied: string[] = [];
  for (const folderName of folders) {
    if (folderName === targetName) break; // stop just before target
    const sqlPath = join(migrationsDir, folderName, 'migration.sql');
    if (!existsSync(sqlPath)) {
      console.error(`  ⚠ Skipping ${folderName} — no migration.sql`);
      continue;
    }
    console.log(`  Applying prior migration: ${folderName}`);
    try {
      await applySql(client, readFileSync(sqlPath, 'utf8'));
      applied.push(folderName);
    } catch (err) {
      throw new Error(
        `Prior migration ${folderName} failed to apply: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
  return applied;
}

function diffSignatures(preSig: string, rollbackSig: string): void {
  const pre: SchemaSignature = JSON.parse(preSig);
  const rb: SchemaSignature = JSON.parse(rollbackSig);

  const preCols = new Set(pre.columns.map((c) => `${c.table_name}.${c.column_name}`));
  const rbCols = new Set(rb.columns.map((c) => `${c.table_name}.${c.column_name}`));
  const colsMissing = [...preCols].filter((k) => !rbCols.has(k));
  const colsExtra = [...rbCols].filter((k) => !preCols.has(k));
  if (colsMissing.length) console.error('  Columns missing after rollback:', colsMissing);
  if (colsExtra.length) console.error('  Columns left over after rollback:', colsExtra);

  const preIdx = new Set(pre.indexes);
  const rbIdx = new Set(rb.indexes);
  const idxMissing = [...preIdx].filter((i) => !rbIdx.has(i));
  const idxExtra = [...rbIdx].filter((i) => !preIdx.has(i));
  if (idxMissing.length) console.error('  Indexes missing after rollback:', idxMissing);
  if (idxExtra.length) console.error('  Indexes left over after rollback:', idxExtra);

  const preEnums = new Map(pre.enums.map((e) => [e.enum_name, new Set(e.values)]));
  const rbEnums = new Map(rb.enums.map((e) => [e.enum_name, new Set(e.values)]));
  const allEnumNames = new Set([...preEnums.keys(), ...rbEnums.keys()]);
  for (const name of allEnumNames) {
    const preVals = preEnums.get(name) ?? new Set<string>();
    const rbVals = rbEnums.get(name) ?? new Set<string>();
    const missing = [...preVals].filter((v) => !rbVals.has(v));
    const extra = [...rbVals].filter((v) => !preVals.has(v));
    if (missing.length || extra.length) {
      console.error(`  Enum "${name}" diff:`, { missing, extra });
    }
  }

  const preFk = new Set(pre.foreign_keys);
  const rbFk = new Set(rb.foreign_keys);
  const fkMissing = [...preFk].filter((f) => !rbFk.has(f));
  const fkExtra = [...rbFk].filter((f) => !preFk.has(f));
  if (fkMissing.length) console.error('  Foreign keys missing after rollback:', fkMissing);
  if (fkExtra.length) console.error('  Foreign keys left over after rollback:', fkExtra);
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
    console.log('Applying prior migrations to shadow DB...');
    const priorsApplied = await applyPriorMigrations(client, folder);
    console.log(`  ✓ ${priorsApplied.length} prior migration(s) applied`);

    console.log('Capturing pre-state...');
    const preSig = await dumpSchemaSignature(client);

    console.log('Applying forward migration (target)...');
    await applySql(client, readFileSync(forwardPath, 'utf8'));
    const postSig = await dumpSchemaSignature(client);

    if (preSig === postSig) {
      console.error('✗ Forward migration changed nothing — invalid test setup');
      return 1;
    }

    console.log('Applying ROLLBACK.sql...');
    await applySql(client, readFileSync(rollbackPath, 'utf8'));
    const rollbackSig = await dumpSchemaSignature(client);

    if (preSig === rollbackSig) {
      console.log('✓ Rollback restores pre-state correctly');
      return 0;
    }

    console.error('✗ ROLLBACK.sql does NOT restore pre-state');
    diffSignatures(preSig, rollbackSig);
    return 1;
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
