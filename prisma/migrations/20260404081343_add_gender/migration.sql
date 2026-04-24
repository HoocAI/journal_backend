/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "isAutomated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "targetValue" TEXT,
ADD COLUMN     "templateKey" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "gender" TEXT,
ADD COLUMN     "googleId" TEXT;

-- CreateTable
CREATE TABLE "AssessmentResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "dimensionScores" JSONB NOT NULL,
    "customerLevel" TEXT,
    "adminLevel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreathingPattern" (
    "id" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "inhaleSec" INTEGER NOT NULL,
    "holdSec" INTEGER NOT NULL,
    "exhaleSec" INTEGER NOT NULL,
    "cycles" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreathingPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionalPrompt" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmotionalPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentResult_userId_idx" ON "AssessmentResult"("userId");

-- CreateIndex
CREATE INDEX "AssessmentResult_goalId_idx" ON "AssessmentResult"("goalId");

-- CreateIndex
CREATE UNIQUE INDEX "BreathingPattern_mood_key" ON "BreathingPattern"("mood");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- AddForeignKey
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
