-- CreateEnum
CREATE TYPE "BahoTuri" AS ENUM ('JORIY', 'NAZORAT', 'ORALIQ', 'YAKUNIY');

-- CreateTable
CREATE TABLE "Baho" (
    "id" TEXT NOT NULL,
    "darsJadvaliId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "sana" TIMESTAMP(3) NOT NULL,
    "turi" "BahoTuri" NOT NULL,
    "ball" INTEGER NOT NULL,
    "maxBall" INTEGER NOT NULL,
    "izoh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Baho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Baho_sana_idx" ON "Baho"("sana");

-- CreateIndex
CREATE INDEX "Baho_studentId_sana_idx" ON "Baho"("studentId", "sana");

-- CreateIndex
CREATE INDEX "Baho_teacherId_sana_idx" ON "Baho"("teacherId", "sana");

-- CreateIndex
CREATE INDEX "Baho_darsJadvaliId_sana_idx" ON "Baho"("darsJadvaliId", "sana");

-- CreateIndex
CREATE UNIQUE INDEX "Baho_darsJadvaliId_studentId_sana_turi_key" ON "Baho"("darsJadvaliId", "studentId", "sana", "turi");

-- AddForeignKey
ALTER TABLE "Baho" ADD CONSTRAINT "Baho_darsJadvaliId_fkey" FOREIGN KEY ("darsJadvaliId") REFERENCES "DarsJadvali"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Baho" ADD CONSTRAINT "Baho_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Baho" ADD CONSTRAINT "Baho_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
