-- CreateEnum
CREATE TYPE "MoliyaTarifHolati" AS ENUM ('REJALANGAN', 'AKTIV', 'ARXIV');

-- AlterTable
ALTER TABLE "MoliyaSozlama" ADD COLUMN     "chegirmaFoiz" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "faolTarifId" TEXT;

-- AlterTable
ALTER TABLE "TolovTranzaksiya" ADD COLUMN     "tarifSnapshot" JSONB,
ADD COLUMN     "tarifVersionId" TEXT;

-- CreateTable
CREATE TABLE "MoliyaTarifVersion" (
    "id" TEXT NOT NULL,
    "oylikSumma" INTEGER NOT NULL,
    "yillikSumma" INTEGER NOT NULL,
    "chegirmaFoiz" INTEGER NOT NULL DEFAULT 0,
    "boshlanishSana" TIMESTAMP(3) NOT NULL,
    "holat" "MoliyaTarifHolati" NOT NULL DEFAULT 'REJALANGAN',
    "izoh" TEXT,
    "yaratganAdminUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoliyaTarifVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoliyaTarifAudit" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "izoh" TEXT,
    "tarifVersionId" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoliyaTarifAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MoliyaTarifVersion_holat_boshlanishSana_idx" ON "MoliyaTarifVersion"("holat", "boshlanishSana");

-- CreateIndex
CREATE INDEX "MoliyaTarifVersion_yaratganAdminUserId_createdAt_idx" ON "MoliyaTarifVersion"("yaratganAdminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "MoliyaTarifAudit_createdAt_idx" ON "MoliyaTarifAudit"("createdAt");

-- CreateIndex
CREATE INDEX "MoliyaTarifAudit_action_createdAt_idx" ON "MoliyaTarifAudit"("action", "createdAt");

-- CreateIndex
CREATE INDEX "MoliyaTarifAudit_performedByUserId_createdAt_idx" ON "MoliyaTarifAudit"("performedByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "MoliyaSozlama" ADD CONSTRAINT "MoliyaSozlama_faolTarifId_fkey" FOREIGN KEY ("faolTarifId") REFERENCES "MoliyaTarifVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoliyaTarifVersion" ADD CONSTRAINT "MoliyaTarifVersion_yaratganAdminUserId_fkey" FOREIGN KEY ("yaratganAdminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoliyaTarifAudit" ADD CONSTRAINT "MoliyaTarifAudit_tarifVersionId_fkey" FOREIGN KEY ("tarifVersionId") REFERENCES "MoliyaTarifVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoliyaTarifAudit" ADD CONSTRAINT "MoliyaTarifAudit_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TolovTranzaksiya" ADD CONSTRAINT "TolovTranzaksiya_tarifVersionId_fkey" FOREIGN KEY ("tarifVersionId") REFERENCES "MoliyaTarifVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
