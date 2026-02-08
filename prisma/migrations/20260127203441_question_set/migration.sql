/*
  Warnings:

  - You are about to drop the `DailyQuestion` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,answerDate]` on the table `QuestionAnswer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `answerDate` to the `QuestionAnswer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "QuestionAnswer" DROP CONSTRAINT "QuestionAnswer_questionId_fkey";

-- AlterTable
ALTER TABLE "QuestionAnswer" ADD COLUMN     "answerDate" TIMESTAMP(3) NOT NULL;

-- DropTable
DROP TABLE "DailyQuestion";

-- CreateTable
CREATE TABLE "QuestionSet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "questionSetId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Question_questionSetId_order_key" ON "Question"("questionSetId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAnswer_userId_answerDate_key" ON "QuestionAnswer"("userId", "answerDate");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "QuestionSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAnswer" ADD CONSTRAINT "QuestionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
