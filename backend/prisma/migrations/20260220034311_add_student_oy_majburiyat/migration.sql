-- CreateEnum
CREATE TYPE "StudentOyMajburiyatHolati" AS ENUM ('BELGILANDI', 'TOLANGAN');

-- CreateTable
CREATE TABLE "StudentOyMajburiyat" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "yil" INTEGER NOT NULL,
    "oy" INTEGER NOT NULL,
    "bazaSumma" INTEGER NOT NULL,
    "imtiyozSumma" INTEGER NOT NULL DEFAULT 0,
    "netSumma" INTEGER NOT NULL,
    "holat" "StudentOyMajburiyatHolati" NOT NULL DEFAULT 'BELGILANDI',
    "source" TEXT NOT NULL DEFAULT 'BAZA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentOyMajburiyat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentOyMajburiyat_studentId_holat_yil_oy_idx" ON "StudentOyMajburiyat"("studentId", "holat", "yil", "oy");

-- CreateIndex
CREATE INDEX "StudentOyMajburiyat_holat_yil_oy_idx" ON "StudentOyMajburiyat"("holat", "yil", "oy");

-- CreateIndex
CREATE UNIQUE INDEX "StudentOyMajburiyat_studentId_yil_oy_key" ON "StudentOyMajburiyat"("studentId", "yil", "oy");

-- AddForeignKey
ALTER TABLE "StudentOyMajburiyat" ADD CONSTRAINT "StudentOyMajburiyat_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
