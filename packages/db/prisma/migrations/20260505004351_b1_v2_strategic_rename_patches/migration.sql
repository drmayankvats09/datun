/*
  Warnings:

  - You are about to drop the column `assignedDoctorId` on the `consultations` table. All the data in the column will be lost.
  - You are about to drop the column `experienceYears` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `primaryClinicId` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `qualification` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `homeClinicId` on the `patients` table. All the data in the column will be lost.
  - Added the required column `qualifications` to the `doctors` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "UserPrimaryRole" ADD VALUE 'OWNER';

-- DropForeignKey
ALTER TABLE "consultations" DROP CONSTRAINT "consultations_assignedDoctorId_fkey";

-- DropForeignKey
ALTER TABLE "doctors" DROP CONSTRAINT "doctors_primaryClinicId_fkey";

-- DropForeignKey
ALTER TABLE "patients" DROP CONSTRAINT "patients_homeClinicId_fkey";

-- DropIndex
DROP INDEX "doctors_primaryClinicId_idx";

-- DropIndex
DROP INDEX "patients_homeClinicId_idx";

-- AlterTable
ALTER TABLE "consultations" DROP COLUMN "assignedDoctorId",
ADD COLUMN     "doctorId" UUID,
ADD COLUMN     "primaryDiagnosisIcd10" TEXT;

-- AlterTable
ALTER TABLE "doctors" DROP COLUMN "experienceYears",
DROP COLUMN "primaryClinicId",
DROP COLUMN "qualification",
ADD COLUMN     "clinicId" UUID,
ADD COLUMN     "qualifications" TEXT NOT NULL,
ADD COLUMN     "yearsExperience" INTEGER;

-- AlterTable
ALTER TABLE "patients" DROP COLUMN "homeClinicId",
ADD COLUMN     "clinicId" UUID;

-- CreateIndex
CREATE INDEX "doctors_clinicId_idx" ON "doctors"("clinicId");

-- CreateIndex
CREATE INDEX "patients_clinicId_idx" ON "patients"("clinicId");

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
