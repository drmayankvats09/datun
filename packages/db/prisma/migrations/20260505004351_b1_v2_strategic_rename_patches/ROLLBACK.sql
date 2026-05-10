-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK.sql — Reverse Migration for b1_v2_strategic_rename_patches
-- ─────────────────────────────────────────────────────────────────────────────
-- Reverses: column renames (assignedDoctorId/doctorId, primaryClinicId/clinicId,
--           homeClinicId/clinicId, qualification/qualifications), index moves,
--           FK moves, UserPrimaryRole 'OWNER' enum value addition
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. Drop new FKs added by this migration
ALTER TABLE "consultations" DROP CONSTRAINT IF EXISTS "consultations_doctorId_fkey";
ALTER TABLE "doctors" DROP CONSTRAINT IF EXISTS "doctors_clinicId_fkey";
ALTER TABLE "patients" DROP CONSTRAINT IF EXISTS "patients_clinicId_fkey";

-- 2. Drop new indexes added by this migration
DROP INDEX IF EXISTS "doctors_clinicId_idx";
DROP INDEX IF EXISTS "patients_clinicId_idx";

-- 3. Reverse consultations column changes
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "doctorId";
ALTER TABLE "consultations" DROP COLUMN IF EXISTS "primaryDiagnosisIcd10";
ALTER TABLE "consultations" ADD COLUMN "assignedDoctorId" UUID;

-- 4. Reverse doctors column changes
--    Original (pre-this-migration): experienceYears INTEGER, primaryClinicId UUID,
--                                   qualification TEXT NOT NULL
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "clinicId";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "qualifications";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "yearsExperience";
ALTER TABLE "doctors" ADD COLUMN "experienceYears" INTEGER;
ALTER TABLE "doctors" ADD COLUMN "primaryClinicId" UUID;
-- qualification was NOT NULL in 0_init. Add nullable, set placeholder, then alter.
-- Empty shadow has no rows so this is essentially atomic.
ALTER TABLE "doctors" ADD COLUMN "qualification" TEXT;
ALTER TABLE "doctors" ALTER COLUMN "qualification" SET NOT NULL;

-- 5. Reverse patients column changes
ALTER TABLE "patients" DROP COLUMN IF EXISTS "clinicId";
ALTER TABLE "patients" ADD COLUMN "homeClinicId" UUID;

-- 6. Recreate the old indexes that this migration dropped
CREATE INDEX "doctors_primaryClinicId_idx" ON "doctors"("primaryClinicId");
CREATE INDEX "patients_homeClinicId_idx" ON "patients"("homeClinicId");

-- 7. Recreate the old FKs that this migration dropped
ALTER TABLE "consultations"
  ADD CONSTRAINT "consultations_assignedDoctorId_fkey"
  FOREIGN KEY ("assignedDoctorId") REFERENCES "doctors"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "doctors"
  ADD CONSTRAINT "doctors_primaryClinicId_fkey"
  FOREIGN KEY ("primaryClinicId") REFERENCES "clinics"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "patients"
  ADD CONSTRAINT "patients_homeClinicId_fkey"
  FOREIGN KEY ("homeClinicId") REFERENCES "clinics"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. Reverse UserPrimaryRole 'OWNER' addition (recreate enum without it)
ALTER TABLE "users" ALTER COLUMN "primaryRole" DROP DEFAULT;
ALTER TYPE "UserPrimaryRole" RENAME TO "UserPrimaryRole_old";
CREATE TYPE "UserPrimaryRole" AS ENUM ('PATIENT', 'CLINIC_OWNER', 'CLINIC_STAFF', 'DOCTOR', 'ADMIN', 'SUPER_ADMIN');
ALTER TABLE "users" ALTER COLUMN "primaryRole" TYPE "UserPrimaryRole"
  USING "primaryRole"::text::"UserPrimaryRole";
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserPrimaryRole"
  USING "role"::text::"UserPrimaryRole";
ALTER TABLE "users" ALTER COLUMN "primaryRole" SET DEFAULT 'PATIENT';
DROP TYPE "UserPrimaryRole_old";

COMMIT;