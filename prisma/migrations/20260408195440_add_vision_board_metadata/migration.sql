-- AlterTable
ALTER TABLE "VisionBoard" ADD COLUMN     "sections" JSONB,
ADD COLUMN     "selectedGoalIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
