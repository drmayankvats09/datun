// ═══════════════════════════════════════════════════════════════
// ERRORS BARREL — Re-export all custom seed error classes
// ═══════════════════════════════════════════════════════════════

export { ProductionDatabaseError } from './production-database.error';
export { SeedFailureError, type SeedFailureContext } from './seed-failure.error';
