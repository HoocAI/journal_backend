/*
  Warnings:

  - You are about to drop the `FirstMoodEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FirstMoodEntry" DROP CONSTRAINT "FirstMoodEntry_userId_fkey";

-- AlterTable
ALTER TABLE "MoodEntry" ADD COLUMN     "whySuchMood" TEXT,
ADD COLUMN     "whyThisMood" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fcmToken" TEXT;

-- DropTable
DROP TABLE "FirstMoodEntry";
