-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SmokingStatus" ADD VALUE 'NEVER_SMOKER';
ALTER TYPE "SmokingStatus" ADD VALUE 'CURRENT_SMOKER';
ALTER TYPE "SmokingStatus" ADD VALUE 'FORMER_SMOKER';
ALTER TYPE "SmokingStatus" ADD VALUE 'OCCASIONAL_SMOKER';
