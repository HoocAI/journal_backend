-- CreateTable
CREATE TABLE "VisionBoard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisionBoardImage" (
    "id" TEXT NOT NULL,
    "visionBoardId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisionBoardImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisionBoard_userId_idx" ON "VisionBoard"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VisionBoard_userId_name_key" ON "VisionBoard"("userId", "name");

-- CreateIndex
CREATE INDEX "VisionBoardImage_visionBoardId_idx" ON "VisionBoardImage"("visionBoardId");

-- AddForeignKey
ALTER TABLE "VisionBoard" ADD CONSTRAINT "VisionBoard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionBoardImage" ADD CONSTRAINT "VisionBoardImage_visionBoardId_fkey" FOREIGN KEY ("visionBoardId") REFERENCES "VisionBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
