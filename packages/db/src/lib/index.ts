/**
 * Migration utilities barrel — re-exports for clean consumer imports.
 *
 * Usage from api/worker:
 *   import { logMigrationAudit, getMigrationHealth } from "@repo/db/lib";
 *   import { training } from "@repo/db/lib";
 *
 * @see docs/adr/0002-prisma-migrations-baseline.md
 * @see docs/adr/0003-training-data-architecture.md
 */

export * from './schema-fingerprint.js';
export * from './migration-lock.js';
export * from './migration-audit.js';
export * from './migration-health.js';
export * from './migration-linter.js';
export * from './migration-notifier.js';
export * from './migration-metrics.js';
export * from './migration-drain.js';
export * as training from './training/index.js';
