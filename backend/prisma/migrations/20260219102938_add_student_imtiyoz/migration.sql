-- CreateEnum
CREATE TYPE "ImtiyozTuri" AS ENUM ('FOIZ', 'SUMMA', 'TOLIQ_OZOD');

-- CreateTable
CREATE TABLE "TolovImtiyozi" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "turi" "ImtiyozTuri" NOT NULL,
    "qiymat" INTEGER,
    "boshlanishOy" TEXT NOT NULL,
    "oylarSoni" INTEGER NOT NULL,
    "sabab" TEXT NOT NULL,
    "izoh" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bekorQilinganAt" TIMESTAMP(3),
    "bekorQilinganAdminUserId" TEXT,
    "bekorQilishSababi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TolovImtiyozi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TolovImtiyozi_studentId_isActive_createdAt_idx" ON "TolovImtiyozi"("studentId", "isActive", "createdAt");

-- CreateIndex
CREATE INDEX "TolovImtiyozi_adminUserId_createdAt_idx" ON "TolovImtiyozi"("adminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "TolovImtiyozi_bekorQilinganAdminUserId_bekorQilinganAt_idx" ON "TolovImtiyozi"("bekorQilinganAdminUserId", "bekorQilinganAt");

-- AddForeignKey
ALTER TABLE "TolovImtiyozi" ADD CONSTRAINT "TolovImtiyozi_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TolovImtiyozi" ADD CONSTRAINT "TolovImtiyozi_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TolovImtiyozi" ADD CONSTRAINT "TolovImtiyozi_bekorQilinganAdminUserId_fkey" FOREIGN KEY ("bekorQilinganAdminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
