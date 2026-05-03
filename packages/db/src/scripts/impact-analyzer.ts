/**
 * impact-analyzer.ts — estimate migration impact on production tables.
 *
 * For each ALTER TABLE / CREATE INDEX in the migration, query production
 * for row count and report estimated lock duration based on heuristics.
 *
 * Heuristics (Stripe / Linear public engineering posts):
 *   - ALTER TABLE ADD COLUMN (no default): instant, even on huge tables
 *   - ALTER TABLE ADD COLUMN (with default): O(rows) — Postgres 11+
 *     uses fast-path for non-volatile defaults but still costs CPU
 *   - CREATE INDEX (non-CONCURRENT): blocks writes for ~ms-per-1000-rows
 *   - CREATE INDEX CONCURRENTLY: 2-3x slower wall-clock but no lock
 *
 * Used by: PR comment in migration-validate.yml workflow
 *
 * Usage: tsx impact-analyzer.ts <migration-folder>
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

interface Impact {
  statement: string;
  table: string;
  rowCount: number;
  estimatedLockMs: number;
  risk: 'low' | 'medium' | 'high';
  rationale: string;
}

async function getRowCount(prisma: PrismaClient, table: string): Promise<number> {
  try {
    const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT count(*)::bigint AS count FROM "${table.replace(/"/g, '')}"`,
    );
    return Number(result[0]?.count ?? 0n);
  } catch {
    return -1; // table doesn't exist yet
  }
}

function analyzeStatement(
  stmt: string,
  rowCount: number,
): Omit<Impact, 'table' | 'rowCount' | 'statement'> {
  const trimmed = stmt.trim();

  if (/^ALTER TABLE.*ADD COLUMN.*DEFAULT/i.test(trimmed)) {
    const lockMs = Math.max(50, rowCount * 0.01);
    return {
      estimatedLockMs: lockMs,
      risk: rowCount > 1_000_000 ? 'high' : rowCount > 100_000 ? 'medium' : 'low',
      rationale: `ADD COLUMN with DEFAULT — fast-path on PG11+ for non-volatile defaults`,
    };
  }
  if (/^ALTER TABLE.*ADD COLUMN/i.test(trimmed)) {
    return {
      estimatedLockMs: 50,
      risk: 'low',
      rationale: 'ADD COLUMN without DEFAULT — instant metadata-only change',
    };
  }
  if (/^CREATE INDEX.*CONCURRENTLY/i.test(trimmed)) {
    return {
      estimatedLockMs: 0,
      risk: 'low',
      rationale: 'CONCURRENT index build — no write lock',
    };
  }
  if (/^CREATE INDEX/i.test(trimmed)) {
    const lockMs = Math.max(100, rowCount * 0.05);
    return {
      estimatedLockMs: lockMs,
      risk: rowCount > 100_000 ? 'high' : rowCount > 10_000 ? 'medium' : 'low',
      rationale: `CREATE INDEX (non-concurrent) — full table write lock`,
    };
  }
  if (/^DROP TABLE/i.test(trimmed)) {
    return {
      estimatedLockMs: 100,
      risk: 'high',
      rationale: 'DROP TABLE — irreversible without backup restore',
    };
  }

  return {
    estimatedLockMs: 50,
    risk: 'low',
    rationale: 'Generic DDL — short metadata lock expected',
  };
}

function extractTable(stmt: string): string | null {
  const m =
    stmt.match(/^ALTER TABLE\s+"(\w+)"/i) ??
    stmt.match(/^DROP TABLE.*"(\w+)"/i) ??
    stmt.match(/^CREATE INDEX.*ON\s+"(\w+)"/i) ??
    stmt.match(/^CREATE TABLE\s+"(\w+)"/i);
  return m?.[1] ?? null;
}

async function main(): Promise<number> {
  const folder = process.argv[2];
  if (!folder) {
    console.error('Usage: tsx impact-analyzer.ts <migration-folder>');
    return 1;
  }
  const path = join(folder, 'migration.sql');
  if (!existsSync(path)) {
    console.error(`Migration not found: ${path}`);
    return 1;
  }

  const sql = readFileSync(path, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  const prisma = new PrismaClient();
  const impacts: Impact[] = [];

  try {
    for (const stmt of statements) {
      const table = extractTable(stmt);
      if (!table) continue;
      const rowCount = await getRowCount(prisma, table);
      const a = analyzeStatement(stmt, rowCount);
      impacts.push({
        statement: stmt.slice(0, 100),
        table,
        rowCount,
        ...a,
      });
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('\nMigration impact analysis\n');
  for (const i of impacts) {
    const icon = i.risk === 'high' ? '🔴' : i.risk === 'medium' ? '🟡' : '🟢';
    console.log(`${icon} ${i.table} (${i.rowCount} rows)`);
    console.log(`   ${i.statement}...`);
    console.log(`   Est lock: ${i.estimatedLockMs}ms | Risk: ${i.risk}`);
    console.log(`   ${i.rationale}\n`);
  }

  const totalLock = impacts.reduce((s, i) => s + i.estimatedLockMs, 0);
  const highRisk = impacts.filter((i) => i.risk === 'high').length;
  console.log(`Total estimated lock time: ${totalLock}ms`);
  console.log(`High-risk operations: ${highRisk}`);
  return highRisk > 0 ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('impact-analyzer crashed:', err);
    process.exit(2);
  });
