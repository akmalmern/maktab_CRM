-- AlterTable
ALTER TABLE "Classroom"
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Classroom_isArchived_idx" ON "Classroom"("isArchived");
