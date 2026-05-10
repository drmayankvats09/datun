-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK.sql — Reverse Migration for wave12_experiment_assignment
-- ─────────────────────────────────────────────────────────────────────────────
-- Reverses: experiment_assignments table + 3 indexes (auto-dropped by CASCADE)
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;
DROP TABLE IF EXISTS "experiment_assignments" CASCADE;
COMMIT;