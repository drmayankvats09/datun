// ═══════════════════════════════════════════════════════════════
// LINT MIGRATION CLI — tsx wrapper for migration-validate workflow
// Replaces broken `node -e require('dist/...')` pattern.
// Usage: tsx src/scripts/lint-migration-cli.ts <migration-folder>
// ═══════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { lintMigration, formatLintReport } from '../lib/migration-linter';

function main(): void {
  const migrationFolder = process.argv[2];
  if (!migrationFolder) {
    process.stderr.write('Error: migration folder path required\n');
    process.stderr.write('Usage: tsx src/scripts/lint-migration-cli.ts <migration-folder>\n');
    process.exit(2);
  }

  const sqlPath = join(migrationFolder, 'migration.sql');
  let sql: string;
  try {
    sql = readFileSync(sqlPath, 'utf8');
  } catch (e) {
    process.stderr.write(
      `Error reading ${sqlPath}: ${e instanceof Error ? e.message : String(e)}\n`,
    );
    process.exit(2);
  }

  const result = lintMigration(sql);
  process.stdout.write(formatLintReport(result) + '\n');
  process.exit(result.passed ? 0 : 1);
}

main();
