-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK.sql — Reverse Migration for 0_init
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ⚠️  CATASTROPHIC OPERATION — READ BEFORE EXECUTING
--
-- This script DROPs every table created by 0_init. Running it against production
-- WILL destroy all user data, consultation records, clinic data, payments,
-- and everything else.
--
-- Acceptable rollback scenarios:
--   1. Migration applied incorrectly to a FRESH/EMPTY database (no data loss)
--   2. Disaster recovery WITH simultaneous Railway snapshot restore
--      (snapshot: pre-task-42-baseline-2026-05-03)
--
-- NOT acceptable:
--   - "Just want to start over" — DON'T. Use Railway snapshot restore instead.
--
-- Author: Datun (Mayank Vats), Task #42, Day 16
-- ADR: docs/adr/0002-prisma-migrations-baseline.md
-- 
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Drop foreign key constraints first (avoid dependency errors)
-- Order: leaf tables first, then root tables

-- Observability tables (Task #42 additions)
DROP TABLE IF EXISTS "schema_snapshot" CASCADE;
DROP TABLE IF EXISTS "migration_audit" CASCADE;

-- Background job system (Task #41 BullMQ)
DROP TABLE IF EXISTS "job_logs" CASCADE;

-- Lead activity (sales pipeline)
DROP TABLE IF EXISTS "lead_activities" CASCADE;
DROP TABLE IF EXISTS "leads" CASCADE;

-- Payment & billing
DROP TABLE IF EXISTS "invoices" CASCADE;
DROP TABLE IF EXISTS "clinic_subscriptions" CASCADE;

-- Compliance
DROP TABLE IF EXISTS "consent_logs" CASCADE;

-- Media (Cloudinary asset tracking)
DROP TABLE IF EXISTS "media_assets" CASCADE;

-- Appointments (clinic-patient bookings)
DROP TABLE IF EXISTS "appointments" CASCADE;

-- Clinic data
DROP TABLE IF EXISTS "clinics" CASCADE;

-- Consultation hierarchy (deepest first)
DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "chat_sessions" CASCADE;
DROP TABLE IF EXISTS "consultation_attachments" CASCADE;
DROP TABLE IF EXISTS "consultations" CASCADE;

-- User-Patient access (RBAC for family healthcare)
DROP TABLE IF EXISTS "user_patient_access" CASCADE;
DROP TABLE IF EXISTS "user_roles" CASCADE;

-- Authentication
DROP TABLE IF EXISTS "user_auth_identities" CASCADE;

-- Patients
DROP TABLE IF EXISTS "patients" CASCADE;

-- Users (root table — last)
DROP TABLE IF EXISTS "users" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "ConsultationStatus" CASCADE;
DROP TYPE IF EXISTS "AppointmentStatus" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
DROP TYPE IF EXISTS "UserRoleType" CASCADE;
-- ... (Prisma will list more — this is template; complete list comes from migration.sql DROPs)

-- Drop Prisma's own migration tracking table (clean slate)
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- POST-ROLLBACK PROCEDURE
-- ─────────────────────────────────────────────────────────────────────────────
-- 
-- 1. Restore Railway snapshot: pre-task-42-baseline-2026-05-03
-- 2. Verify table count: SELECT count(*) FROM information_schema.tables WHERE table_schema='public';
-- 3. Notify team: Sentry alert + Slack post-mortem
-- 4. Open incident retrospective: docs/postmortems/{date}-task-42-rollback.md
-- ─────────────────────────────────────────────────────────────────────────────