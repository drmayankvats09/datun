/*
  Warnings:

  - The `comorbidConditionsIcd10` column on the `patients` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `preferredLocale` column on the `patients` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `templateName` column on the `whatsapp_messages` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `prescriberRegistrationNumber` to the `prescriptions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WhatsAppTemplateCategory" AS ENUM ('MARKETING', 'UTILITY', 'AUTHENTICATION', 'AUTHENTICATION_INTERNATIONAL', 'SERVICE');

-- CreateEnum
CREATE TYPE "WhatsAppTemplateName" AS ENUM ('consultation_complete', 'internal_alert', 'three_day_followup', 'seven_day_followup', 'appointment_reminder', 'weekly_tip', 'appointment_confirmation', 'prescription_ready', 'payment_reminder', 'onboarding_welcome');

-- CreateEnum
CREATE TYPE "ComplianceProfile" AS ENUM ('DPDP_INDIA', 'HIPAA_US', 'GDPR_EU', 'PIPEDA_CANADA', 'LGPD_BRAZIL', 'PDPA_SINGAPORE', 'NONE');

-- CreateEnum
CREATE TYPE "SeedErrorCode" AS ENUM ('E_NEED_USERS', 'E_NEED_OWNER_USERS', 'E_NEED_DOCTOR_USERS', 'E_NEED_PATIENT_USERS', 'E_NEED_CLINICS', 'E_MODULE_NOT_ALLOWED_TEST', 'E_MODULE_NOT_ALLOWED_DEV', 'E_MODULE_NOT_ALLOWED_PROD', 'E_MODULE_NOT_ALLOWED_STAGING', 'E_DEPENDENCY_MISSING', 'E_INVARIANT_VIOLATED', 'E_QUOTA_EXCEEDED', 'E_DATA_DRIFT', 'E_DETERMINISM_FAILED', 'E_ANONYMIZATION_FAILED', 'E_SCHEMA_MISMATCH');

-- CreateEnum
CREATE TYPE "MedicationCategory" AS ENUM ('ANTIBIOTIC', 'ANALGESIC_OPIOID', 'ANALGESIC_NON_OPIOID', 'NSAID', 'ANTACID_PPI', 'ANTI_INFLAMMATORY', 'LOCAL_ANESTHETIC', 'ANTIFUNGAL', 'ANTIVIRAL', 'ANTISEPTIC_ORAL', 'SEDATIVE_HYPNOTIC', 'CORTICOSTEROID', 'MOUTHWASH', 'TOPICAL_DENTAL', 'VITAMIN_MINERAL', 'HEMOSTATIC', 'OTHER');

-- CreateEnum
CREATE TYPE "PregnancyCategory" AS ENUM ('A', 'B', 'C', 'D', 'X', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DrugSchedule" AS ENUM ('OTC', 'SCHEDULE_G', 'SCHEDULE_H', 'SCHEDULE_H1', 'SCHEDULE_X', 'SCHEDULE_K', 'NARCOTIC', 'PSYCHOTROPIC', 'NONE');

-- CreateEnum
CREATE TYPE "InteractionSeverity" AS ENUM ('CONTRAINDICATED', 'MAJOR', 'MODERATE', 'MINOR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ArchetypeLocale" AS ENUM ('NORTH_INDIA_URBAN', 'NORTH_INDIA_RURAL', 'SOUTH_INDIA_URBAN', 'SOUTH_INDIA_RURAL', 'EAST_INDIA_URBAN', 'EAST_INDIA_RURAL', 'WEST_INDIA_URBAN', 'WEST_INDIA_RURAL', 'CENTRAL_INDIA_URBAN', 'CENTRAL_INDIA_RURAL', 'METRO_TIER_1', 'METRO_TIER_2', 'METRO_TIER_3');

-- CreateEnum
CREATE TYPE "PromptUseCase" AS ENUM ('CONSULTATION_TRIAGE', 'DIAGNOSIS_GENERATION', 'PRESCRIPTION_GENERATION', 'HOME_REMEDIES', 'APPOINTMENT_SUMMARY', 'SAFETY_CHECK', 'HANDOFF_DOCTOR', 'PATIENT_FOLLOWUP', 'PHOTO_ANALYSIS', 'URGENCY_TRIAGE', 'SYMPTOM_CLARIFICATION', 'DRUG_INTERACTION_CHECK', 'PREGNANCY_SAFETY_CHECK', 'PEDIATRIC_DOSING_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LineItemReviewStatus" AS ENUM ('NOT_REVIEWED', 'APPROVED', 'FLAGGED_ALLERGY', 'FLAGGED_PREGNANCY', 'FLAGGED_INTERACTION', 'FLAGGED_DOSAGE', 'FLAGGED_BLOOD_THINNER', 'FLAGGED_PEDIATRIC', 'FLAGGED_RENAL_IMPAIRMENT', 'FLAGGED_HEPATIC_IMPAIRMENT', 'REJECTED_BY_DOCTOR');

-- CreateEnum
CREATE TYPE "LocaleCode" AS ENUM ('en', 'hi', 'pa', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'or', 'as', 'ur');

-- CreateEnum
CREATE TYPE "KycLevel" AS ENUM ('NONE', 'BASIC_PHONE_VERIFIED', 'EMAIL_VERIFIED', 'GOVERNMENT_ID_PENDING', 'GOVERNMENT_ID_VERIFIED', 'ABHA_VERIFIED', 'DOCTOR_VERIFIED');

-- CreateEnum
CREATE TYPE "ProcessingPurpose" AS ENUM ('CONSULTATION', 'APPOINTMENT', 'PRESCRIPTION', 'BILLING', 'AUDIT_LOG', 'LEGAL_COMPLIANCE', 'AI_TRAINING', 'ANALYTICS_AGGREGATED', 'MARKETING', 'EMERGENCY_CARE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConsultationStatus" ADD VALUE 'AWAITING_PATIENT';
ALTER TYPE "ConsultationStatus" ADD VALUE 'AWAITING_DOCTOR';
ALTER TYPE "ConsultationStatus" ADD VALUE 'ESCALATED';
ALTER TYPE "ConsultationStatus" ADD VALUE 'HANDED_OFF_TO_DOCTOR';
ALTER TYPE "ConsultationStatus" ADD VALUE 'PHYSICAL_VISIT_RECOMMENDED';
ALTER TYPE "ConsultationStatus" ADD VALUE 'EMERGENCY_REFERRED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageRole" ADD VALUE 'PATIENT';
ALTER TYPE "MessageRole" ADD VALUE 'AI';
ALTER TYPE "MessageRole" ADD VALUE 'DOCTOR';
ALTER TYPE "MessageRole" ADD VALUE 'NURSE';
ALTER TYPE "MessageRole" ADD VALUE 'PHARMACIST';
ALTER TYPE "MessageRole" ADD VALUE 'SYSTEM_AUTOMATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WhatsAppStatus" ADD VALUE 'PENDING';
ALTER TYPE "WhatsAppStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "WhatsAppStatus" ADD VALUE 'EXPIRED';
ALTER TYPE "WhatsAppStatus" ADD VALUE 'REJECTED_BY_USER';
ALTER TYPE "WhatsAppStatus" ADD VALUE 'SUPERSEDED';

-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "acceptsEmergencies" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "acceptsInsurance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "acceptsTelemedicine" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "complianceProfile" "ComplianceProfile" NOT NULL DEFAULT 'DPDP_INDIA',
ADD COLUMN     "dataRetentionDays" INTEGER NOT NULL DEFAULT 2555,
ADD COLUMN     "primaryLocale" "LocaleCode" NOT NULL DEFAULT 'en',
ADD COLUMN     "subscriptionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata';

-- AlterTable
ALTER TABLE "consultations" ADD COLUMN     "ageVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "ageVerifiedMethod" TEXT,
ADD COLUMN     "aiCircuitBreakerHits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "assignedDoctorId" UUID,
ADD COLUMN     "chiefComplaintLocale" "LocaleCode",
ADD COLUMN     "clinicId" UUID,
ADD COLUMN     "consentVersion" TEXT,
ADD COLUMN     "fallbackProviderUsed" TEXT,
ADD COLUMN     "icd10ChapterCode" TEXT,
ADD COLUMN     "icd10Code" TEXT,
ADD COLUMN     "isAiOnly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "patientAge" INTEGER,
ADD COLUMN     "patientGender" "Gender",
ADD COLUMN     "patientPregnancyStatus" "PregnancyStatus",
ADD COLUMN     "requiresPhysicalVisit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "severity" "UrgencyLevel";

-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "acceptsEmergencies" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "acceptsTelemedicine" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "degree" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "languagesSpoken" "LocaleCode"[],
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "primaryClinicId" UUID,
ADD COLUMN     "registrationState" TEXT,
ADD COLUMN     "registrationVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "title" TEXT DEFAULT 'Dr.';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "locale" "LocaleCode" NOT NULL DEFAULT 'en',
ADD COLUMN     "relatedEntityId" TEXT,
ADD COLUMN     "relatedEntityType" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "abhaId" TEXT,
ADD COLUMN     "archetypeKey" TEXT,
ADD COLUMN     "consentVersion" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "governmentIdHash" TEXT,
ADD COLUMN     "kycLevel" "KycLevel" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "lastConsentRenewedAt" TIMESTAMP(3),
ADD COLUMN     "retentionUntil" TIMESTAMP(3),
ADD COLUMN     "verifiedNameAt" TIMESTAMP(3),
DROP COLUMN "comorbidConditionsIcd10",
ADD COLUMN     "comorbidConditionsIcd10" TEXT[],
DROP COLUMN "preferredLocale",
ADD COLUMN     "preferredLocale" "LocaleCode" NOT NULL DEFAULT 'en',
ALTER COLUMN "safetyConstraints" DROP DEFAULT;

-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "allergiesChecked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bloodThinnerChecked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "interactionsChecked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isTelemedicinePrescription" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lineItemCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pediatricDosingApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "physicalConsultationRecommended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pregnancyChecked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prescriberRegistrationCouncil" TEXT,
ADD COLUMN     "prescriberRegistrationNumber" TEXT NOT NULL,
ADD COLUMN     "prescriberSpecialization" TEXT;

-- AlterTable
ALTER TABLE "whatsapp_messages" ADD COLUMN     "appointmentId" UUID,
ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "metaMessageId" TEXT,
ADD COLUMN     "patientId" UUID,
ADD COLUMN     "pricingCategory" TEXT,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "recipientPhone" TEXT,
ADD COLUMN     "relatedEntityId" TEXT,
ADD COLUMN     "relatedEntityType" TEXT,
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "senderPhoneNumberId" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "templateCategory" "WhatsAppTemplateCategory",
ADD COLUMN     "templateLocale" "LocaleCode" NOT NULL DEFAULT 'en',
ADD COLUMN     "templateNameLegacy" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "templateName",
ADD COLUMN     "templateName" "WhatsAppTemplateName";

-- CreateTable
CREATE TABLE "medication_salts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "genericName" TEXT NOT NULL,
    "brandNames" JSONB,
    "atcCode" TEXT,
    "ipMonographRef" TEXT,
    "nameLocalized" JSONB,
    "category" "MedicationCategory" NOT NULL,
    "subcategory" TEXT,
    "schedule" "DrugSchedule" NOT NULL DEFAULT 'NONE',
    "isScheduleX" BOOLEAN NOT NULL DEFAULT false,
    "isNarcotic" BOOLEAN NOT NULL DEFAULT false,
    "isPsychotropic" BOOLEAN NOT NULL DEFAULT false,
    "isOTC" BOOLEAN NOT NULL DEFAULT false,
    "isTelemedicineEligible" BOOLEAN NOT NULL DEFAULT true,
    "telemedicineRestrictions" JSONB,
    "dosageForms" JSONB NOT NULL,
    "defaultDosageMg" DECIMAL(10,4),
    "maxDailyDoseMg" DECIMAL(10,4),
    "pediatricDosing" JSONB,
    "geriatricDosing" JSONB,
    "renalAdjustment" JSONB,
    "hepaticAdjustment" JSONB,
    "pregnancyCategory" "PregnancyCategory" NOT NULL DEFAULT 'UNKNOWN',
    "lactationCategory" TEXT,
    "contraindications" JSONB,
    "sideEffects" JSONB,
    "blackBoxWarnings" JSONB,
    "indications" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deprecatedAt" TIMESTAMP(3),
    "deprecationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_salts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_interactions" (
    "id" UUID NOT NULL,
    "saltAId" UUID NOT NULL,
    "saltBId" UUID NOT NULL,
    "severity" "InteractionSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "mechanism" TEXT,
    "management" TEXT,
    "references" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medication_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dental_conditions" (
    "id" UUID NOT NULL,
    "icd10Code" TEXT NOT NULL,
    "chapterCode" TEXT NOT NULL,
    "subchapterCode" TEXT,
    "parentCode" TEXT,
    "name" TEXT NOT NULL,
    "nameLocalized" JSONB,
    "shortDescription" TEXT,
    "fullDescription" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "isLeafCode" BOOLEAN NOT NULL DEFAULT false,
    "excludesCodes" TEXT[],
    "includesCodes" TEXT[],
    "seeAlsoCodes" TEXT[],
    "prevalencePercent" DOUBLE PRECISION,
    "typicalSeverity" "UrgencyLevel" NOT NULL DEFAULT 'ROUTINE',
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "requiresXray" BOOLEAN NOT NULL DEFAULT false,
    "affectedAgeGroups" JSONB,
    "riskFactors" JSONB,
    "symptoms" JSONB,
    "homeRemedies" JSONB,
    "typicalMedications" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dental_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_archetypes" (
    "id" UUID NOT NULL,
    "archetypeKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "locale" "ArchetypeLocale" NOT NULL,
    "ageMin" INTEGER NOT NULL,
    "ageMax" INTEGER NOT NULL,
    "gender" JSONB NOT NULL,
    "sesTiers" JSONB NOT NULL,
    "residence" JSONB NOT NULL,
    "educationLevels" JSONB NOT NULL,
    "populationWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "primaryConditionIcd10" TEXT NOT NULL,
    "comorbidConditionsIcd10" JSONB,
    "pregnancyStatus" JSONB NOT NULL,
    "smokingStatus" JSONB NOT NULL,
    "preferredLanguages" JSONB NOT NULL,
    "insuranceLikely" JSONB NOT NULL,
    "referralChannels" JSONB NOT NULL,
    "behaviors" JSONB,
    "safetyConstraints" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_archetypes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_prompts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "useCase" "PromptUseCase" NOT NULL,
    "content" TEXT NOT NULL,
    "contentLocale" "LocaleCode" NOT NULL DEFAULT 'en',
    "modelTarget" TEXT,
    "temperature" DOUBLE PRECISION,
    "maxTokens" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCanonical" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercent" INTEGER NOT NULL DEFAULT 0,
    "deprecatedAt" TIMESTAMP(3),
    "releasedById" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_line_items" (
    "id" UUID NOT NULL,
    "prescriptionId" UUID NOT NULL,
    "medicationSaltId" UUID,
    "medicationNameLegacy" TEXT,
    "brandNameSuggested" TEXT,
    "dosageMg" DECIMAL(10,4),
    "dosageUnit" TEXT DEFAULT 'mg',
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "durationDays" INTEGER,
    "routeOfAdministration" TEXT DEFAULT 'oral',
    "instructions" TEXT,
    "instructionsLocale" "LocaleCode",
    "allergyChecked" BOOLEAN NOT NULL DEFAULT false,
    "pregnancyChecked" BOOLEAN NOT NULL DEFAULT false,
    "bloodThinnerChecked" BOOLEAN NOT NULL DEFAULT false,
    "pediatricDoseAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "geriatricDoseAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "interactionChecked" BOOLEAN NOT NULL DEFAULT false,
    "renalAdjustmentApplied" BOOLEAN NOT NULL DEFAULT false,
    "hepaticAdjustmentApplied" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" "LineItemReviewStatus" NOT NULL DEFAULT 'NOT_REVIEWED',
    "reviewNotes" TEXT,
    "sequenceNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescription_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "patientId" UUID,
    "consultationId" UUID,
    "purpose" "ProcessingPurpose" NOT NULL,
    "dataCategories" TEXT[],
    "legalBasis" TEXT NOT NULL,
    "accessedBy" TEXT,
    "accessedFromIp" TEXT,
    "accessedFromUa" TEXT,
    "consentVersion" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "retentionUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deletion_requests" (
    "id" UUID NOT NULL,
    "requestedByUserId" UUID,
    "targetUserId" UUID,
    "targetPatientId" UUID,
    "requestType" TEXT NOT NULL,
    "requestReason" TEXT,
    "noticeIssuedAt" TIMESTAMP(3),
    "noticeAcknowledgedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledDeletionAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "verifiedByMethod" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medication_salts_name_key" ON "medication_salts"("name");

-- CreateIndex
CREATE INDEX "medication_salts_category_idx" ON "medication_salts"("category");

-- CreateIndex
CREATE INDEX "medication_salts_schedule_idx" ON "medication_salts"("schedule");

-- CreateIndex
CREATE INDEX "medication_salts_isTelemedicineEligible_idx" ON "medication_salts"("isTelemedicineEligible");

-- CreateIndex
CREATE INDEX "medication_salts_isActive_idx" ON "medication_salts"("isActive");

-- CreateIndex
CREATE INDEX "medication_salts_atcCode_idx" ON "medication_salts"("atcCode");

-- CreateIndex
CREATE INDEX "medication_interactions_severity_idx" ON "medication_interactions"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "medication_interactions_saltAId_saltBId_key" ON "medication_interactions"("saltAId", "saltBId");

-- CreateIndex
CREATE UNIQUE INDEX "dental_conditions_icd10Code_key" ON "dental_conditions"("icd10Code");

-- CreateIndex
CREATE INDEX "dental_conditions_chapterCode_idx" ON "dental_conditions"("chapterCode");

-- CreateIndex
CREATE INDEX "dental_conditions_subchapterCode_idx" ON "dental_conditions"("subchapterCode");

-- CreateIndex
CREATE INDEX "dental_conditions_parentCode_idx" ON "dental_conditions"("parentCode");

-- CreateIndex
CREATE INDEX "dental_conditions_isUrgent_idx" ON "dental_conditions"("isUrgent");

-- CreateIndex
CREATE INDEX "dental_conditions_isLeafCode_idx" ON "dental_conditions"("isLeafCode");

-- CreateIndex
CREATE INDEX "dental_conditions_isActive_idx" ON "dental_conditions"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "patient_archetypes_archetypeKey_key" ON "patient_archetypes"("archetypeKey");

-- CreateIndex
CREATE INDEX "patient_archetypes_locale_idx" ON "patient_archetypes"("locale");

-- CreateIndex
CREATE INDEX "patient_archetypes_primaryConditionIcd10_idx" ON "patient_archetypes"("primaryConditionIcd10");

-- CreateIndex
CREATE INDEX "patient_archetypes_isActive_idx" ON "patient_archetypes"("isActive");

-- CreateIndex
CREATE INDEX "system_prompts_useCase_idx" ON "system_prompts"("useCase");

-- CreateIndex
CREATE INDEX "system_prompts_isActive_isCanonical_idx" ON "system_prompts"("isActive", "isCanonical");

-- CreateIndex
CREATE UNIQUE INDEX "system_prompts_name_version_contentLocale_key" ON "system_prompts"("name", "version", "contentLocale");

-- CreateIndex
CREATE INDEX "prescription_line_items_prescriptionId_idx" ON "prescription_line_items"("prescriptionId");

-- CreateIndex
CREATE INDEX "prescription_line_items_medicationSaltId_idx" ON "prescription_line_items"("medicationSaltId");

-- CreateIndex
CREATE INDEX "prescription_line_items_reviewStatus_idx" ON "prescription_line_items"("reviewStatus");

-- CreateIndex
CREATE INDEX "processing_logs_userId_idx" ON "processing_logs"("userId");

-- CreateIndex
CREATE INDEX "processing_logs_patientId_idx" ON "processing_logs"("patientId");

-- CreateIndex
CREATE INDEX "processing_logs_consultationId_idx" ON "processing_logs"("consultationId");

-- CreateIndex
CREATE INDEX "processing_logs_purpose_idx" ON "processing_logs"("purpose");

-- CreateIndex
CREATE INDEX "processing_logs_retentionUntil_idx" ON "processing_logs"("retentionUntil");

-- CreateIndex
CREATE INDEX "processing_logs_createdAt_idx" ON "processing_logs"("createdAt");

-- CreateIndex
CREATE INDEX "deletion_requests_requestedByUserId_idx" ON "deletion_requests"("requestedByUserId");

-- CreateIndex
CREATE INDEX "deletion_requests_targetUserId_idx" ON "deletion_requests"("targetUserId");

-- CreateIndex
CREATE INDEX "deletion_requests_targetPatientId_idx" ON "deletion_requests"("targetPatientId");

-- CreateIndex
CREATE INDEX "deletion_requests_status_idx" ON "deletion_requests"("status");

-- CreateIndex
CREATE INDEX "deletion_requests_scheduledDeletionAt_idx" ON "deletion_requests"("scheduledDeletionAt");

-- CreateIndex
CREATE INDEX "doctors_primaryClinicId_idx" ON "doctors"("primaryClinicId");

-- CreateIndex
CREATE INDEX "doctors_isAcceptingPatients_idx" ON "doctors"("isAcceptingPatients");

-- CreateIndex
CREATE INDEX "doctors_acceptsEmergencies_idx" ON "doctors"("acceptsEmergencies");

-- CreateIndex
CREATE INDEX "doctors_deletedAt_idx" ON "doctors"("deletedAt");

-- CreateIndex
CREATE INDEX "doctors_registrationNumber_idx" ON "doctors"("registrationNumber");

-- CreateIndex
CREATE INDEX "patients_homeClinicId_idx" ON "patients"("homeClinicId");

-- CreateIndex
CREATE INDEX "patients_fullName_idx" ON "patients"("fullName");

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "patients_primaryConditionIcd10_idx" ON "patients"("primaryConditionIcd10");

-- CreateIndex
CREATE INDEX "patients_archetypeKey_idx" ON "patients"("archetypeKey");

-- CreateIndex
CREATE INDEX "patients_kycLevel_idx" ON "patients"("kycLevel");

-- CreateIndex
CREATE INDEX "patients_deletedAt_idx" ON "patients"("deletedAt");

-- CreateIndex
CREATE INDEX "whatsapp_messages_metaMessageId_idx" ON "whatsapp_messages"("metaMessageId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_scheduledFor_idx" ON "whatsapp_messages"("scheduledFor");

-- CreateIndex
CREATE INDEX "whatsapp_messages_patientId_idx" ON "whatsapp_messages"("patientId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_templateCategory_idx" ON "whatsapp_messages"("templateCategory");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_homeClinicId_fkey" FOREIGN KEY ("homeClinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_primaryClinicId_fkey" FOREIGN KEY ("primaryClinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_assignedDoctorId_fkey" FOREIGN KEY ("assignedDoctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_interactions" ADD CONSTRAINT "medication_interactions_saltAId_fkey" FOREIGN KEY ("saltAId") REFERENCES "medication_salts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_interactions" ADD CONSTRAINT "medication_interactions_saltBId_fkey" FOREIGN KEY ("saltBId") REFERENCES "medication_salts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_line_items" ADD CONSTRAINT "prescription_line_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_line_items" ADD CONSTRAINT "prescription_line_items_medicationSaltId_fkey" FOREIGN KEY ("medicationSaltId") REFERENCES "medication_salts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
