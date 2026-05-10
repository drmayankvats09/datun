-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK.sql — Reverse Migration for waves_6_to_12_extensions
-- ─────────────────────────────────────────────────────────────────────────────
-- Reverses: 16 new tables (audit/training/privacy/outbox/drift/prompt/shadow),
--           20 patient columns, 7 user columns, googleId/appleId unique indexes
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Drop the 16 tables created by this migration (CASCADE drops indexes/FKs)
DROP TABLE IF EXISTS "shadow_comparison" CASCADE;
DROP TABLE IF EXISTS "prompt_rollout_plan" CASCADE;
DROP TABLE IF EXISTS "prompt_version" CASCADE;
DROP TABLE IF EXISTS "guardrail_violation" CASCADE;
DROP TABLE IF EXISTS "drift_alert" CASCADE;
DROP TABLE IF EXISTS "outbox_dead_letter" CASCADE;
DROP TABLE IF EXISTS "outbox_event" CASCADE;
DROP TABLE IF EXISTS "slo_breach" CASCADE;
DROP TABLE IF EXISTS "data_quality_anomaly" CASCADE;
DROP TABLE IF EXISTS "quarantined_row" CASCADE;
DROP TABLE IF EXISTS "privacy_budget_spend" CASCADE;
DROP TABLE IF EXISTS "privacy_budget" CASCADE;
DROP TABLE IF EXISTS "preference_pair" CASCADE;
DROP TABLE IF EXISTS "fine_tune_run" CASCADE;
DROP TABLE IF EXISTS "training_example" CASCADE;
DROP TABLE IF EXISTS "seed_anonymization_audit" CASCADE;
DROP TABLE IF EXISTS "seed_audit_log" CASCADE;

-- Drop unique indexes added on users (CASCADE handles dependencies)
DROP INDEX IF EXISTS "users_googleId_key";
DROP INDEX IF EXISTS "users_appleId_key";

-- Reverse users column additions
ALTER TABLE "users" DROP COLUMN IF EXISTS "appleId";
ALTER TABLE "users" DROP COLUMN IF EXISTS "firstName";
ALTER TABLE "users" DROP COLUMN IF EXISTS "fullName";
ALTER TABLE "users" DROP COLUMN IF EXISTS "googleId";
ALTER TABLE "users" DROP COLUMN IF EXISTS "lastName";
ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
ALTER TABLE "users" ALTER COLUMN "name" DROP DEFAULT;

-- Reverse patients column additions
ALTER TABLE "patients" DROP COLUMN IF EXISTS "ageYears";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "alcoholUse";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "comorbidConditionsIcd10";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "dateOfBirth";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "educationLevel";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "email";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "firstName";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "fullName";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "gender";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "homeClinicId";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "insuranceId";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "knownAllergies";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "lastName";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "preferredLocale";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "primaryConditionIcd10";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "referralChannel";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "residence";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "safetyConstraints";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "sesTier";

COMMIT;