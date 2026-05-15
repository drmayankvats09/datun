/*
  Warnings:

  - Added the required column `kind` to the `media_assets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('CONSULTATION_PHOTO', 'PRESCRIPTION_DOC', 'USER_AVATAR', 'CLINIC_COVER', 'CLINIC_GALLERY', 'DOCTOR_AVATAR', 'BLOG_IMAGE', 'OG_IMAGE', 'BRAND_ASSET');

-- CreateEnum
CREATE TYPE "MediaProvider" AS ENUM ('R2', 'CLOUDFLARE_IMAGES', 'CLOUDINARY');

-- CreateEnum
CREATE TYPE "MediaModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MediaScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED');

-- CreateEnum
CREATE TYPE "MediaLifecycleStatus" AS ENUM ('INITIATED', 'UPLOADED', 'PROCESSING', 'READY', 'REJECTED', 'FAILED');

-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "coverImageMediaId" UUID;

-- AlterTable
ALTER TABLE "consultation_messages" ADD COLUMN     "attachedMediaId" UUID;

-- AlterTable
ALTER TABLE "consultations" ADD COLUMN     "coverPhotoMediaId" UUID;

-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "avatarMediaId" UUID;

-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN     "blurhash" TEXT,
ADD COLUMN     "cfImageId" TEXT,
ADD COLUMN     "consentLogId" UUID,
ADD COLUMN     "exifStripped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "height" INTEGER,
ADD COLUMN     "kind" "MediaKind" NOT NULL,
ADD COLUMN     "moderationFlags" JSONB,
ADD COLUMN     "moderationScore" DOUBLE PRECISION,
ADD COLUMN     "moderationStatus" "MediaModerationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "originalFilename" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "provider" "MediaProvider" NOT NULL DEFAULT 'R2',
ADD COLUMN     "retentionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "scanStatus" "MediaScanStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "status" "MediaLifecycleStatus" NOT NULL DEFAULT 'INITIATED',
ADD COLUMN     "trainingEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "variants" JSONB,
ADD COLUMN     "width" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatarMediaId" UUID,
ADD COLUMN     "mediaAssetId" UUID;

-- CreateIndex
CREATE INDEX "media_assets_kind_status_idx" ON "media_assets"("kind", "status");

-- CreateIndex
CREATE INDEX "media_assets_status_processedAt_idx" ON "media_assets"("status", "processedAt");

-- CreateIndex
CREATE INDEX "media_assets_retentionExpiresAt_idx" ON "media_assets"("retentionExpiresAt");

-- CreateIndex
CREATE INDEX "media_assets_consentLogId_idx" ON "media_assets"("consentLogId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_coverImageMediaId_fkey" FOREIGN KEY ("coverImageMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_coverPhotoMediaId_fkey" FOREIGN KEY ("coverPhotoMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_messages" ADD CONSTRAINT "consultation_messages_attachedMediaId_fkey" FOREIGN KEY ("attachedMediaId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_consentLogId_fkey" FOREIGN KEY ("consentLogId") REFERENCES "consent_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
