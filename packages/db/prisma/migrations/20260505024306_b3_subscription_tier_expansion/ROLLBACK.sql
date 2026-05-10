-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK.sql — Reverse Migration for b3_subscription_tier_expansion
-- ─────────────────────────────────────────────────────────────────────────────
-- Reverses: SubscriptionTier enum extensions
--   Removes: TRIAL, STARTER, ENTERPRISE, PATIENT_PRO
--   Restores: FREE, PRO (0_init originals)
-- Affects columns: users.subscriptionTier, clinics.subscriptionTier
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE "users" ALTER COLUMN "subscriptionTier" DROP DEFAULT;
ALTER TABLE "clinics" ALTER COLUMN "subscriptionTier" DROP DEFAULT;

ALTER TYPE "SubscriptionTier" RENAME TO "SubscriptionTier_old";
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'PRO');

ALTER TABLE "users" ALTER COLUMN "subscriptionTier" TYPE "SubscriptionTier"
  USING "subscriptionTier"::text::"SubscriptionTier";
ALTER TABLE "clinics" ALTER COLUMN "subscriptionTier" TYPE "SubscriptionTier"
  USING "subscriptionTier"::text::"SubscriptionTier";

ALTER TABLE "users" ALTER COLUMN "subscriptionTier" SET DEFAULT 'FREE';
ALTER TABLE "clinics" ALTER COLUMN "subscriptionTier" SET DEFAULT 'FREE';

DROP TYPE "SubscriptionTier_old";

COMMIT;