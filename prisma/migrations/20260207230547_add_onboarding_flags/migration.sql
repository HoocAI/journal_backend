-- AlterTable
ALTER TABLE "User" ADD COLUMN     "goalsSet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
