-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN "subjectId" TEXT;

-- Migrate old specialization -> Subject
INSERT INTO "Subject" ("id", "name", "createdAt", "updatedAt")
SELECT
    'subj_' || md5(trim("specialization")),
    trim("specialization"),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Teacher"
WHERE "specialization" IS NOT NULL
  AND trim("specialization") <> ''
GROUP BY trim("specialization");

UPDATE "Teacher" t
SET "subjectId" = 'subj_' || md5(trim(t."specialization"))
WHERE t."specialization" IS NOT NULL
  AND trim(t."specialization") <> '';

-- CreateIndex
CREATE INDEX "Teacher_subjectId_idx" ON "Teacher"("subjectId");

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old field
ALTER TABLE "Teacher" DROP COLUMN "specialization";
