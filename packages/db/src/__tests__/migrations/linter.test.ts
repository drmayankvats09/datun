/**
 * Migration Linter Tests — verify policy rules catch dangerous patterns.
 *
 * Pure unit tests — no DB.
 */

import { describe, it, expect } from 'vitest';
import { lintMigration } from '../../lib/migration-linter.js';

describe('migration linter', () => {
  it('[1/3] flags DROP TABLE as error', () => {
    const sql = `DROP TABLE "users";`;
    const result = lintMigration(sql);
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.rule === 'no-drop-table')).toBe(true);
  });

  it('[2/3] flags ADD COLUMN NOT NULL without DEFAULT as error', () => {
    const sql = `ALTER TABLE "users" ADD COLUMN "newCol" TEXT NOT NULL;`;
    const result = lintMigration(sql);
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.rule === 'not-null-without-default')).toBe(true);
  });

  it('[3/3] passes a clean additive migration', () => {
    const sql = `
      CREATE TABLE "new_table" ("id" TEXT NOT NULL, CONSTRAINT "new_table_pkey" PRIMARY KEY ("id"));
      ALTER TABLE "users" ADD COLUMN "newCol" TEXT;
      CREATE INDEX CONCURRENTLY "users_newCol_idx" ON "users"("newCol");
    `;
    const result = lintMigration(sql);
    expect(result.errorCount).toBe(0);
  });
});
