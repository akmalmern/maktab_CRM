-- CreateEnum
CREATE TYPE "DavomatHolati" AS ENUM ('KELDI', 'KECHIKDI', 'SABABLI', 'SABABSIZ');

-- CreateTable
CREATE TABLE "Davomat" (
    "id" TEXT NOT NULL,
    "darsJadvaliId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "belgilaganTeacherId" TEXT NOT NULL,
    "sana" TIMESTAMP(3) NOT NULL,
    "holat" "DavomatHolati" NOT NULL,
    "izoh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Davomat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Davomat_sana_idx" ON "Davomat"("sana");

-- CreateIndex
CREATE INDEX "Davomat_studentId_sana_idx" ON "Davomat"("studentId", "sana");

-- CreateIndex
CREATE INDEX "Davomat_darsJadvaliId_sana_idx" ON "Davomat"("darsJadvaliId", "sana");

-- CreateIndex
CREATE UNIQUE INDEX "Davomat_darsJadvaliId_studentId_sana_key" ON "Davomat"("darsJadvaliId", "studentId", "sana");

-- AddForeignKey
ALTER TABLE "Davomat" ADD CONSTRAINT "Davomat_darsJadvaliId_fkey" FOREIGN KEY ("darsJadvaliId") REFERENCES "DarsJadvali"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Davomat" ADD CONSTRAINT "Davomat_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Davomat" ADD CONSTRAINT "Davomat_belgilaganTeacherId_fkey" FOREIGN KEY ("belgilaganTeacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
