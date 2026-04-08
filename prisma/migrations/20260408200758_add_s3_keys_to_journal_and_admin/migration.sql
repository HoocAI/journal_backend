-- AlterTable
ALTER TABLE "AdminAudio" ADD COLUMN     "s3Key" TEXT;

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "audioS3Key" TEXT,
ADD COLUMN     "photoS3Key" TEXT;
