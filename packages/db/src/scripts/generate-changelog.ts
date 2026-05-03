/**
 * generate-changelog.ts — produce human-readable summary of a migration.
 *
 * Parses migration.sql and outputs:
 *   - Tables added / removed
 *   - Columns added / removed
 *   - Indexes added / removed
 *   - Constraints added / removed
 *   - Enums added / values added
 *
 * Used by:
 *   - PR comment in migration-validate.yml
 *   - CHANGELOG.md auto-population
 *   - Investor due-diligence reports
 *
 * Usage: tsx generate-changelog.ts <migration-folder>
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface ChangelogReport {
  migration: string;
  tablesAdded: string[];
  tablesDropped: string[];
  columnsAdded: Array<{ table: string; column: string }>;
  columnsDropped: Array<{ table: string; column: string }>;
  indexesAdded: string[];
  indexesDropped: string[];
  constraintsAdded: string[];
  enumsAdded: string[];
}

function parseMigration(sql: string, name: string): ChangelogReport {
  const r: ChangelogReport = {
    migration: name,
    tablesAdded: [],
    tablesDropped: [],
    columnsAdded: [],
    columnsDropped: [],
    indexesAdded: [],
    indexesDropped: [],
    constraintsAdded: [],
    enumsAdded: [],
  };

  const lines = sql.split('\n');
  for (const line of lines) {
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^CREATE TABLE\s+"(\w+)"/i)) && m[1]) {
      r.tablesAdded.push(m[1]);
    } else if ((m = line.match(/^DROP TABLE.*"(\w+)"/i)) && m[1]) {
      r.tablesDropped.push(m[1]);
    } else if ((m = line.match(/^ALTER TABLE\s+"(\w+)"\s+ADD COLUMN\s+"(\w+)"/i)) && m[1] && m[2]) {
      r.columnsAdded.push({ table: m[1], column: m[2] });
    } else if (
      (m = line.match(/^ALTER TABLE\s+"(\w+)"\s+DROP COLUMN\s+"(\w+)"/i)) &&
      m[1] &&
      m[2]
    ) {
      r.columnsDropped.push({ table: m[1], column: m[2] });
    } else if (
      (m = line.match(/^CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?"(\w+)"/i)) &&
      m[1]
    ) {
      r.indexesAdded.push(m[1]);
    } else if ((m = line.match(/^DROP INDEX.*"(\w+)"/i)) && m[1]) {
      r.indexesDropped.push(m[1]);
    } else if ((m = line.match(/ADD CONSTRAINT\s+"(\w+)"/i)) && m[1]) {
      r.constraintsAdded.push(m[1]);
    } else if ((m = line.match(/^CREATE TYPE\s+"(\w+)"/i)) && m[1]) {
      r.enumsAdded.push(m[1]);
    }
  }

  return r;
}

function formatReport(r: ChangelogReport): string {
  const lines: string[] = [`# Migration: \`${r.migration}\``, ''];
  if (r.tablesAdded.length) {
    lines.push(`## Tables added (${r.tablesAdded.length})`);
    r.tablesAdded.forEach((t) => lines.push(`- \`${t}\``));
    lines.push('');
  }
  if (r.tablesDropped.length) {
    lines.push(`## Tables dropped (${r.tablesDropped.length}) ⚠️`);
    r.tablesDropped.forEach((t) => lines.push(`- \`${t}\``));
    lines.push('');
  }
  if (r.columnsAdded.length) {
    lines.push(`## Columns added (${r.columnsAdded.length})`);
    r.columnsAdded.forEach((c) => lines.push(`- \`${c.table}\`.\`${c.column}\``));
    lines.push('');
  }
  if (r.columnsDropped.length) {
    lines.push(`## Columns dropped (${r.columnsDropped.length}) ⚠️`);
    r.columnsDropped.forEach((c) => lines.push(`- \`${c.table}\`.\`${c.column}\``));
    lines.push('');
  }
  if (r.indexesAdded.length) {
    lines.push(`## Indexes added (${r.indexesAdded.length})`);
    r.indexesAdded.forEach((i) => lines.push(`- \`${i}\``));
    lines.push('');
  }
  if (r.constraintsAdded.length) {
    lines.push(`## Constraints added (${r.constraintsAdded.length})`);
    r.constraintsAdded.forEach((c) => lines.push(`- \`${c}\``));
    lines.push('');
  }
  if (r.enumsAdded.length) {
    lines.push(`## Enums added (${r.enumsAdded.length})`);
    r.enumsAdded.forEach((e) => lines.push(`- \`${e}\``));
    lines.push('');
  }
  return lines.join('\n');
}

function main(): number {
  const folder = process.argv[2];
  if (!folder) {
    console.error('Usage: tsx generate-changelog.ts <migration-folder>');
    return 1;
  }
  const sqlPath = join(folder, 'migration.sql');
  if (!existsSync(sqlPath)) {
    console.error(`Migration SQL not found: ${sqlPath}`);
    return 1;
  }

  const sql = readFileSync(sqlPath, 'utf8');
  const report = parseMigration(sql, folder.split(/[\\/]/).pop() ?? folder);
  console.log(formatReport(report));
  return 0;
}

process.exit(main());
