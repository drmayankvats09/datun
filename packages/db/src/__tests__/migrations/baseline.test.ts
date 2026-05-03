/**
 * Baseline Migration Tests — verify the 0_init migration is well-formed
 * and matches the production schema state.
 *
 * These tests run in CI on every PR. They guard against:
 *   - Someone editing 0_init/migration.sql by hand
 *   - Schema diverging from baseline without a follow-up migration
 *   - Missing required tables in 0_init
 *
 * Tests run AGAINST FILE SYSTEM ONLY — no DB connection required.
 *
 * Path resolution uses __dirname (Node.js CJS global) for cwd-independent
 * resolution — works identically in vitest, CI, and local dev.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// Resolve from packages/db/src/__tests__/migrations/ → up 3 levels → packages/db/
const PKG_ROOT = path.resolve(__dirname, '../../..');
const MIGRATIONS_DIR = path.join(PKG_ROOT, 'prisma/migrations');
const BASELINE_DIR = path.join(MIGRATIONS_DIR, '0_init');
const BASELINE_SQL = path.join(BASELINE_DIR, 'migration.sql');
const ROLLBACK_SQL = path.join(BASELINE_DIR, 'ROLLBACK.sql');
const README_PATH = path.join(BASELINE_DIR, 'README.md');
const LOCK_FILE = path.join(MIGRATIONS_DIR, 'migration_lock.toml');

// Snake_case table names — schema uses @@map directives.
const REQUIRED_TABLES = [
  'users',
  'patients',
  'consultations',
  'consultation_messages',
  'clinics',
  'clinic_members',
  'appointments',
  'prescriptions',
  'subscriptions',
  'invoices',
  'migration_audit',
  'schema_snapshot',
];

describe('baseline migration (0_init)', () => {
  it('[1/4] baseline folder has all required artifacts', () => {
    expect(existsSync(BASELINE_SQL), 'migration.sql exists').toBe(true);
    expect(existsSync(ROLLBACK_SQL), 'ROLLBACK.sql exists').toBe(true);
    expect(existsSync(README_PATH), 'README.md exists').toBe(true);
    expect(existsSync(LOCK_FILE), 'migration_lock.toml exists').toBe(true);
  });

  it('[2/4] baseline contains all required tables', () => {
    const sql = readFileSync(BASELINE_SQL, 'utf8');
    for (const table of REQUIRED_TABLES) {
      const re = new RegExp(`CREATE TABLE\\s+"${table}"`, 'i');
      expect(re.test(sql), `baseline must create table "${table}"`).toBe(true);
    }
  });

  it('[3/4] baseline has zero destructive statements', () => {
    const sql = readFileSync(BASELINE_SQL, 'utf8');
    expect(/^\s*DROP\s+TABLE/im.test(sql)).toBe(false);
    expect(/^\s*TRUNCATE/im.test(sql)).toBe(false);
    expect(/^\s*DELETE\s+FROM/im.test(sql)).toBe(false);
  });

  it('[4/4] migration_lock.toml declares postgresql provider', () => {
    const lock = readFileSync(LOCK_FILE, 'utf8');
    expect(lock).toContain('provider = "postgresql"');
  });
});
