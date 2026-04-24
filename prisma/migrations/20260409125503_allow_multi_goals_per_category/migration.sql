-- DropIndex
DROP INDEX "Goal_userId_type_key";

-- CreateIndex
CREATE INDEX "Goal_userId_type_idx" ON "Goal"("userId", "type");
