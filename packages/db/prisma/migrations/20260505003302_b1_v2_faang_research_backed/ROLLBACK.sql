-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK.sql — Reverse Migration for b1_v2_faang_research_backed
-- ─────────────────────────────────────────────────────────────────────────────
-- Reverses: 14 new enum types, 8 new tables, ~80 column additions across 7
--           tables, 6 enum extensions (Consultation/Message/WhatsApp), 7 FKs
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- 1. Drop new tables (CASCADE handles indexes + FKs from this migration)
-- ────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS "deletion_requests" CASCADE;
DROP TABLE IF EXISTS "processing_logs" CASCADE;
DROP TABLE IF EXISTS "prescription_line_items" CASCADE;
DROP TABLE IF EXISTS "system_prompts" CASCADE;
DROP TABLE IF EXISTS "patient_archetypes" CASCADE;
DROP TABLE IF EXISTS "dental_conditions" CASCADE;
DROP TABLE IF EXISTS "medication_interactions" CASCADE;
DROP TABLE IF EXISTS "medication_salts" CASCADE;

-- ────────────────────────────────────────────────────────────────
-- 2. Drop FKs added on existing tables
-- ────────────────────────────────────────────────────────────────
ALTER TABLE "consultations" DROP CONSTRAINT IF EXISTS "consultations_clinicId_fkey";
ALTER TABLE "consultations" DROP CONSTRAINT IF EXISTS "consultations_assignedDoctorId_fkey";
ALTER TABLE "doctors" DROP CONSTRAINT IF EXISTS "doctors_primaryClinicId_fkey";
ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "patients_homeClinicId_fkey";

-- ────────────────────────────────────────────────────────────────
-- 3. Drop indexes added on existing tables
-- ────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS "doctors_primaryClinicId_idx";
DROP INDEX IF EXISTS "doctors_isAcceptingPatients_idx";
DROP INDEX IF EXISTS "doctors_acceptsEmergencies_idx";
DROP INDEX IF EXISTS "doctors_deletedAt_idx";
DROP INDEX IF EXISTS "doctors_registrationNumber_idx";
DROP INDEX IF EXISTS "patients_homeClinicId_idx";
DROP INDEX IF EXISTS "patients_fullName_idx";
DROP INDEX IF EXISTS "patients_phone_idx";
DROP INDEX IF EXISTS "patients_primaryConditionIcd10_idx";
DROP INDEX IF EXISTS "patients_archetypeKey_idx";
DROP INDEX IF EXISTS "patients_kycLevel_idx";
DROP INDEX IF EXISTS "patients_deletedAt_idx";
DROP INDEX IF EXISTS "whatsapp_messages_metaMessageId_idx";
DROP INDEX IF EXISTS "whatsapp_messages_scheduledFor_idx";
DROP INDEX IF EXISTS "whatsapp_messages_patientId_idx";
DROP INDEX IF EXISTS "whatsapp_messages_templateCategory_idx";

-- ────────────────────────────────────────────────────────────────
-- 4. Reverse column additions on whatsapp_messages
-- (templateName: was TEXT NOT NULL in 0_init, became enum in this migration)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "appointmentId";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "deliveredAt";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "metaMessageId";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "patientId";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "pricingCategory";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "readAt";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "recipientPhone";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "relatedEntityId";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "relatedEntityType";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "scheduledFor";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "senderPhoneNumberId";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "sentAt";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "templateCategory";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "templateLocale";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "templateNameLegacy";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "updatedAt";
ALTER TABLE "whatsapp_messages" DROP COLUMN IF EXISTS "templateName";
-- Restore original 0_init definition
ALTER TABLE "whatsapp_messages" ADD COLUMN "templateName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "whatsapp_messages" ALTER COLUMN "templateName" DROP DEFAULT;

-- ────────────────────────────────────────────────────────────────
-- 5. Reverse column additions on prescriptions
-- ────────────────────────────────────────────────────────────────
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "allergiesChecked";
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "bloodThinnerChecked";
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "interactionsChecked";
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "isTelemedicinePrescription";
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "lineItemCount";
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "pediatricDosingApplied";
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "physicalConsultationRecommended";
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "pregnancyChecked";
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "prescriberRegistrationCouncil";
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "prescriberRegistrationNumber";
ALTER TABLE "prescriptions" DROP COLUMN IF EXISTS "prescriberSpecialization";

-- ────────────────────────────────────────────────────────────────
-- 6. Reverse column additions on patients
-- (comorbidConditionsIcd10 + preferredLocale were dropped+recreated)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE "patients" DROP COLUMN IF EXISTS "abhaId";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "archetypeKey";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "consentVersion";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "governmentIdHash";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "kycLevel";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "lastConsentRenewedAt";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "retentionUntil";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "verifiedNameAt";
ALTER TABLE "patients" DROP COLUMN IF EXISTS "comorbidConditionsIcd10";
ALTER TABLE "patients" ADD COLUMN "comorbidConditionsIcd10" JSONB;
ALTER TABLE "patients" DROP COLUMN IF EXISTS "preferredLocale";
ALTER TABLE "patients" ADD COLUMN "preferredLocale" TEXT;
ALTER TABLE "patients" ALTER COLUMN "safetyConstraints" SET DEFAULT ARRAY[]::TEXT[];

-- ────────────────────────────────────────────────────────────────
-- 7. Reverse column additions on notifications
-- ────────────────────────────────────────────────────────────────
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "locale";
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "relatedEntityId";
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "relatedEntityType";
ALTER TABLE "notifications" DROP COLUMN IF EXISTS "updatedAt";

-- ────────────────────────────────────────────────────────────────
-- 8. Reverse column additions on doctors
-- ────────────────────────────────────────────────────────────────
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "acceptsEmergencies";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "acceptsTelemedicine";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "degree";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "firstName";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "languagesSpoken";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "lastName";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "primaryClinicId";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "registrationState";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "registrationVerifiedAt";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "title";

-- ────────────────────────────────────────────────────────────────
-- 9. Reverse column additions on consultations
-- ────────────────────────────────────────────────────────────────
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "ageVerifiedAt";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "ageVerifiedMethod";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "aiCircuitBreakerHits";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "assignedDoctorId";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "chiefComplaintLocale";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "clinicId";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "consentVersion";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "fallbackProviderUsed";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "icd10ChapterCode";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "icd10Code";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "isAiOnly";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "patientAge";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "patientGender";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "patientPregnancyStatus";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "requiresPhysicalVisit";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "severity";

-- ────────────────────────────────────────────────────────────────
-- 10. Reverse column additions on clinics
-- ────────────────────────────────────────────────────────────────
ALTER TABLE "clinics" DROP COLUMN IF EXISTS "acceptsEmergencies";
ALTER TABLE "clinics" DROP COLUMN IF EXISTS "acceptsInsurance";
ALTER TABLE "clinics" DROP COLUMN IF EXISTS "acceptsTelemedicine";
ALTER TABLE "clinics" DROP COLUMN IF EXISTS "complianceProfile";
ALTER TABLE "clinics" DROP COLUMN IF EXISTS "dataRetentionDays";
ALTER TABLE "clinics" DROP COLUMN IF EXISTS "primaryLocale";
ALTER TABLE "clinics" DROP COLUMN IF EXISTS "subscriptionExpiresAt";
ALTER TABLE "clinics" DROP COLUMN IF EXISTS "subscriptionTier";
ALTER TABLE "clinics" DROP COLUMN IF EXISTS "timezone";

-- ────────────────────────────────────────────────────────────────
-- 11. Reverse enum extensions — recreate types with original 0_init values
-- (No rows in shadow DB → cast through text is safe)
-- ────────────────────────────────────────────────────────────────

-- ConsultationStatus: drop 6 added values
ALTER TABLE "consultations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "ConsultationStatus" RENAME TO "ConsultationStatus_old";
CREATE TYPE "ConsultationStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'EXPIRED');
ALTER TABLE "consultations" ALTER COLUMN "status" TYPE "ConsultationStatus"
  USING "status"::text::"ConsultationStatus";
ALTER TABLE "consultations" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
DROP TYPE "ConsultationStatus_old";

-- MessageRole: drop 6 added values
ALTER TYPE "MessageRole" RENAME TO "MessageRole_old";
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
ALTER TABLE "consultation_messages" ALTER COLUMN "role" TYPE "MessageRole"
  USING "role"::text::"MessageRole";
DROP TYPE "MessageRole_old";

-- WhatsAppStatus: drop 5 added values
ALTER TABLE "whatsapp_messages" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "WhatsAppStatus" RENAME TO "WhatsAppStatus_old";
CREATE TYPE "WhatsAppStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');
ALTER TABLE "whatsapp_messages" ALTER COLUMN "status" TYPE "WhatsAppStatus"
  USING "status"::text::"WhatsAppStatus";
ALTER TABLE "whatsapp_messages" ALTER COLUMN "status" SET DEFAULT 'QUEUED';
DROP TYPE "WhatsAppStatus_old";

-- ────────────────────────────────────────────────────────────────
-- 12. Drop the 14 new enum types created by this migration
-- ────────────────────────────────────────────────────────────────
DROP TYPE IF EXISTS "ProcessingPurpose" CASCADE;
DROP TYPE IF EXISTS "KycLevel" CASCADE;
DROP TYPE IF EXISTS "LocaleCode" CASCADE;
DROP TYPE IF EXISTS "LineItemReviewStatus" CASCADE;
DROP TYPE IF EXISTS "PromptUseCase" CASCADE;
DROP TYPE IF EXISTS "ArchetypeLocale" CASCADE;
DROP TYPE IF EXISTS "InteractionSeverity" CASCADE;
DROP TYPE IF EXISTS "DrugSchedule" CASCADE;
DROP TYPE IF EXISTS "PregnancyCategory" CASCADE;
DROP TYPE IF EXISTS "MedicationCategory" CASCADE;
DROP TYPE IF EXISTS "SeedErrorCode" CASCADE;
DROP TYPE IF EXISTS "ComplianceProfile" CASCADE;
DROP TYPE IF EXISTS "WhatsAppTemplateName" CASCADE;
DROP TYPE IF EXISTS "WhatsAppTemplateCategory" CASCADE;

COMMIT;