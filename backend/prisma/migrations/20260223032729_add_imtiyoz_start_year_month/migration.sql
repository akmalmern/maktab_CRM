-- AlterTable
ALTER TABLE "TolovImtiyozi" ADD COLUMN     "boshlanishOyRaqam" INTEGER,
ADD COLUMN     "boshlanishYil" INTEGER;

-- CreateIndex
CREATE INDEX "TolovImtiyozi_studentId_isActive_boshlanishYil_boshlanishOy_idx" ON "TolovImtiyozi"("studentId", "isActive", "boshlanishYil", "boshlanishOyRaqam");
