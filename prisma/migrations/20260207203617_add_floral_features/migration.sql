-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MoodType" ADD VALUE 'JOYFUL';
ALTER TYPE "MoodType" ADD VALUE 'EXCITED';
ALTER TYPE "MoodType" ADD VALUE 'PROUD';
ALTER TYPE "MoodType" ADD VALUE 'GRATEFUL';
ALTER TYPE "MoodType" ADD VALUE 'PEACEFUL';
ALTER TYPE "MoodType" ADD VALUE 'CONTENT';
ALTER TYPE "MoodType" ADD VALUE 'PLAYFUL';
ALTER TYPE "MoodType" ADD VALUE 'HOPEFUL';
ALTER TYPE "MoodType" ADD VALUE 'CURIOUS';
ALTER TYPE "MoodType" ADD VALUE 'SAD';
ALTER TYPE "MoodType" ADD VALUE 'DEPRESSED';
ALTER TYPE "MoodType" ADD VALUE 'LONELY';
ALTER TYPE "MoodType" ADD VALUE 'HURT';
ALTER TYPE "MoodType" ADD VALUE 'DISAPPOINTED';
ALTER TYPE "MoodType" ADD VALUE 'ANGRY';
ALTER TYPE "MoodType" ADD VALUE 'FRUSTRATED';
ALTER TYPE "MoodType" ADD VALUE 'ANNOYED';
ALTER TYPE "MoodType" ADD VALUE 'ANXIOUS';
ALTER TYPE "MoodType" ADD VALUE 'OVERWHELMED';
ALTER TYPE "MoodType" ADD VALUE 'STRESSED';
ALTER TYPE "MoodType" ADD VALUE 'NERVOUS';
ALTER TYPE "MoodType" ADD VALUE 'INSECURE';
ALTER TYPE "MoodType" ADD VALUE 'TIRED';
ALTER TYPE "MoodType" ADD VALUE 'BORED';
ALTER TYPE "MoodType" ADD VALUE 'NUMB';
ALTER TYPE "MoodType" ADD VALUE 'GUILTY';
ALTER TYPE "MoodType" ADD VALUE 'ASHAMED';

-- DropIndex
DROP INDEX "MoodEntry_userId_entryDate_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "focus" TEXT[],
ADD COLUMN     "language" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "timezone" TEXT;

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "MoodEntry_userId_entryDate_idx" ON "MoodEntry"("userId", "entryDate");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
