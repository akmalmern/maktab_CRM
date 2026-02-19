-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';

-- CreateTable
CREATE TABLE "QarzdorIzoh" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "managerUserId" TEXT NOT NULL,
    "izoh" TEXT NOT NULL,
    "promisedPayDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QarzdorIzoh_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QarzdorIzoh_studentId_createdAt_idx" ON "QarzdorIzoh"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "QarzdorIzoh_managerUserId_createdAt_idx" ON "QarzdorIzoh"("managerUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "QarzdorIzoh" ADD CONSTRAINT "QarzdorIzoh_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QarzdorIzoh" ADD CONSTRAINT "QarzdorIzoh_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
