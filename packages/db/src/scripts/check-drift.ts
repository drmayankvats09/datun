/**
 * check-drift.ts — schema drift detection.
 *
 * Compares the canonical `schema.prisma` against the actual database
 * structure using `prisma migrate diff --from-url --to-schema-datamodel`.
 *
 * Exits:
 *   0 → no drift
 *   1 → drift detected (full SQL diff in stderr)
 *   2 → tooling error (database unreachable, prisma CLI missing, etc.)
 *
 * Used by:
 *   - .husky/pre-push (warn before push)
 *   - .github/workflows/nightly-drift-check.yml (alert if drift in prod)
 *   - Operator manual run during incident investigation
 */

import { execSync } from 'node:child_process';

interface DriftResult {
  hasDrift: boolean;
  diffSql: string;
}

function runDriftCheck(databaseUrl: string): DriftResult {
  const cmd =
    `npx prisma migrate diff ` +
    `--from-url "${databaseUrl}" ` +
    `--to-schema-datamodel packages/db/prisma/schema.prisma ` +
    `--script`;
  const output = execSync(cmd, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // An "empty" migration is the marker for no drift
  const isEmpty = output.trim() === '-- This is an empty migration.';
  return {
    hasDrift: !isEmpty,
    diffSql: output,
  };
}

function main(): number {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not set — cannot check drift.');
    return 2;
  }

  console.log('Checking schema drift against database...\n');

  let result: DriftResult;
  try {
    result = runDriftCheck(databaseUrl);
  } catch (err) {
    console.error('Drift check tooling failed:', (err as Error).message);
    return 2;
  }

  if (!result.hasDrift) {
    console.log('✓ No drift detected — schema and database are in sync.');
    return 0;
  }

  console.error('✗ DRIFT DETECTED — schema differs from database state.');
  console.error('');
  console.error('Diff SQL (what would need to run to align database to schema):');
  console.error('---');
  console.error(result.diffSql);
  console.error('---');
  console.error('');
  console.error('Resolution: see docs/runbooks/migration-drift-detected.md');
  return 1;
}

process.exit(main());
