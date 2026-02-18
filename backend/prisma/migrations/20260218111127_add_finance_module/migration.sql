-- CreateEnum
CREATE TYPE "TolovTuri" AS ENUM ('OYLIK', 'YILLIK', 'IXTIYORIY');

-- CreateTable
CREATE TABLE "MoliyaSozlama" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'MAIN',
    "oylikSumma" INTEGER NOT NULL,
    "yillikSumma" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoliyaSozlama_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TolovTranzaksiya" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "turi" "TolovTuri" NOT NULL,
    "summa" INTEGER NOT NULL,
    "tolovSana" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "izoh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TolovTranzaksiya_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TolovQoplama" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tranzaksiyaId" TEXT NOT NULL,
    "yil" INTEGER NOT NULL,
    "oy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TolovQoplama_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MoliyaSozlama_key_key" ON "MoliyaSozlama"("key");

-- CreateIndex
CREATE INDEX "TolovTranzaksiya_studentId_tolovSana_idx" ON "TolovTranzaksiya"("studentId", "tolovSana");

-- CreateIndex
CREATE INDEX "TolovTranzaksiya_adminUserId_tolovSana_idx" ON "TolovTranzaksiya"("adminUserId", "tolovSana");

-- CreateIndex
CREATE INDEX "TolovQoplama_studentId_yil_oy_idx" ON "TolovQoplama"("studentId", "yil", "oy");

-- CreateIndex
CREATE INDEX "TolovQoplama_tranzaksiyaId_idx" ON "TolovQoplama"("tranzaksiyaId");

-- CreateIndex
CREATE UNIQUE INDEX "TolovQoplama_studentId_yil_oy_key" ON "TolovQoplama"("studentId", "yil", "oy");

-- AddForeignKey
ALTER TABLE "TolovTranzaksiya" ADD CONSTRAINT "TolovTranzaksiya_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TolovTranzaksiya" ADD CONSTRAINT "TolovTranzaksiya_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TolovQoplama" ADD CONSTRAINT "TolovQoplama_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TolovQoplama" ADD CONSTRAINT "TolovQoplama_tranzaksiyaId_fkey" FOREIGN KEY ("tranzaksiyaId") REFERENCES "TolovTranzaksiya"("id") ON DELETE CASCADE ON UPDATE CASCADE;
