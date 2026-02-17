-- CreateEnum
CREATE TYPE "HaftaKuni" AS ENUM ('DUSHANBA', 'SESHANBA', 'CHORSHANBA', 'PAYSHANBA', 'JUMA', 'SHANBA');

-- CreateTable
CREATE TABLE "VaqtOraliq" (
    "id" TEXT NOT NULL,
    "nomi" TEXT NOT NULL,
    "boshlanishVaqti" TEXT NOT NULL,
    "tugashVaqti" TEXT NOT NULL,
    "tartib" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaqtOraliq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DarsJadvali" (
    "id" TEXT NOT NULL,
    "sinfId" TEXT NOT NULL,
    "oqituvchiId" TEXT NOT NULL,
    "fanId" TEXT NOT NULL,
    "haftaKuni" "HaftaKuni" NOT NULL,
    "vaqtOraliqId" TEXT NOT NULL,
    "oquvYili" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DarsJadvali_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VaqtOraliq_boshlanishVaqti_tugashVaqti_key" ON "VaqtOraliq"("boshlanishVaqti", "tugashVaqti");

-- CreateIndex
CREATE UNIQUE INDEX "VaqtOraliq_tartib_key" ON "VaqtOraliq"("tartib");

-- CreateIndex
CREATE INDEX "DarsJadvali_sinfId_idx" ON "DarsJadvali"("sinfId");

-- CreateIndex
CREATE INDEX "DarsJadvali_oqituvchiId_idx" ON "DarsJadvali"("oqituvchiId");

-- CreateIndex
CREATE INDEX "DarsJadvali_fanId_idx" ON "DarsJadvali"("fanId");

-- CreateIndex
CREATE INDEX "DarsJadvali_vaqtOraliqId_idx" ON "DarsJadvali"("vaqtOraliqId");

-- CreateIndex
CREATE UNIQUE INDEX "DarsJadvali_sinfId_haftaKuni_vaqtOraliqId_oquvYili_key" ON "DarsJadvali"("sinfId", "haftaKuni", "vaqtOraliqId", "oquvYili");

-- CreateIndex
CREATE UNIQUE INDEX "DarsJadvali_oqituvchiId_haftaKuni_vaqtOraliqId_oquvYili_key" ON "DarsJadvali"("oqituvchiId", "haftaKuni", "vaqtOraliqId", "oquvYili");

-- AddForeignKey
ALTER TABLE "DarsJadvali" ADD CONSTRAINT "DarsJadvali_sinfId_fkey" FOREIGN KEY ("sinfId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarsJadvali" ADD CONSTRAINT "DarsJadvali_oqituvchiId_fkey" FOREIGN KEY ("oqituvchiId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarsJadvali" ADD CONSTRAINT "DarsJadvali_fanId_fkey" FOREIGN KEY ("fanId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DarsJadvali" ADD CONSTRAINT "DarsJadvali_vaqtOraliqId_fkey" FOREIGN KEY ("vaqtOraliqId") REFERENCES "VaqtOraliq"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
