// ═══════════════════════════════════════════════════════════════
// SEED LIMITS — Numeric constants tuned for Datun v2 scale
// Pattern: Linear @linear/constants, Stripe per-domain limits files
//
// Adjust SEED_COUNTS to scale demo data; SCALE_MAX_FACTOR for load tests.
// ═══════════════════════════════════════════════════════════════

/**
 * Base counts per entity (PDF spec: 5 clinics, 5 dentists, 50 patients,
 * 20 consultations, 10 appointments). Demo clinic adds incrementally.
 */
export const SEED_COUNTS = {
  USERS: 60, // 50 patients + 5 dentists + 5 reserved
  PATIENTS: 50,
  DOCTORS: 5,
  CLINICS: 5,
  CLINIC_MEMBERS: 8,
  DOCTOR_CLINICS: 7, // some doctors at 2 clinics
  CONSULTATIONS: 20,
  CONSULTATION_MESSAGES_PER_CONSULTATION_MIN: 4,
  CONSULTATION_MESSAGES_PER_CONSULTATION_MAX: 8,
  TRAINING_LABELS: 10,
  APPOINTMENTS: 10,
  PRESCRIPTIONS: 8,
  WHATSAPP_MESSAGES: 15,
  CONSENT_LOGS: 50, // one per patient
  SUBSCRIPTIONS: 3,
  INVOICES: 6,
  NOTIFICATIONS: 25,
  AUDIT_LOGS: 30,
  JOB_LOGS: 10,
} as const;

/**
 * Demo clinic adds these on top of base counts.
 * Hand-curated, deterministic UUIDs.
 */
export const DEMO_COUNTS = {
  CLINIC: 1,
  DOCTORS: 2,
  PATIENTS: 5,
  CONSULTATIONS: 5,
  APPOINTMENTS: 3,
} as const;

/**
 * Scale strategy multiplier limits (Task #109 load testing).
 * Hard cap = 100K patients / 1M consultations to prevent OOM.
 */
export const SCALE_MAX_FACTOR = 1000;
export const SCALE_MIN_FACTOR = 1;

/**
 * Batch size for parallel inserts (Postgres connection pool aware).
 * Railway hobby plan = 22 connections; we leave 10 for app traffic.
 */
export const PARALLEL_BATCH_SIZE = 12;

/**
 * Bcrypt rounds for seed users — INTENTIONALLY LOW.
 * Prod uses 12 rounds (~250ms). Seed uses 4 rounds (~5ms).
 * Documented in ADR-0004. Test users only — never reused in prod.
 */
export const SEED_BCRYPT_ROUNDS = 4;

/**
 * Max time any single module is allowed (ms). Forces hard fail on stuck queries.
 * Prevents seed runs from hanging in CI.
 */
export const MODULE_TIMEOUT_MS = 60_000;

/**
 * UUID v5 namespace for deterministic IDs.
 * DO NOT CHANGE — would invalidate all existing demo bookmarks.
 */
export const SEED_UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Reserved phone block for test users (DPDP-safe).
 * +91-99999-XXXXX is reserved per Indian DoT testing convention.
 */
export const TEST_PHONE_PREFIX = '+919999';

/**
 * Domain for test emails — RFC 2606 reserved.
 */
export const TEST_EMAIL_DOMAIN = 'example.com';
