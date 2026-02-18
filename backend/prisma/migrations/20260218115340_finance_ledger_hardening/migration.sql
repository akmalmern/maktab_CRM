-- CreateEnum
CREATE TYPE "TolovTranzaksiyaHolati" AS ENUM ('AKTIV', 'BEKOR_QILINGAN');

-- AlterTable
ALTER TABLE "TolovTranzaksiya" ADD COLUMN     "bekorIzoh" TEXT,
ADD COLUMN     "bekorQilganAdminUserId" TEXT,
ADD COLUMN     "bekorSana" TIMESTAMP(3),
ADD COLUMN     "holat" "TolovTranzaksiyaHolati" NOT NULL DEFAULT 'AKTIV',
ADD COLUMN     "qoplanganOylar" JSONB;

-- CreateIndex
CREATE INDEX "TolovTranzaksiya_holat_tolovSana_idx" ON "TolovTranzaksiya"("holat", "tolovSana");

-- CreateIndex
CREATE INDEX "TolovTranzaksiya_bekorQilganAdminUserId_bekorSana_idx" ON "TolovTranzaksiya"("bekorQilganAdminUserId", "bekorSana");

-- AddForeignKey
ALTER TABLE "TolovTranzaksiya" ADD CONSTRAINT "TolovTranzaksiya_bekorQilganAdminUserId_fkey" FOREIGN KEY ("bekorQilganAdminUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
