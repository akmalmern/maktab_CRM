-- CreateIndex
CREATE INDEX "DarsJadvali_oqituvchiId_sinfId_haftaKuni_idx" ON "DarsJadvali"("oqituvchiId", "sinfId", "haftaKuni");

-- CreateIndex
CREATE INDEX "Davomat_holat_sana_idx" ON "Davomat"("holat", "sana");

-- CreateIndex
CREATE INDEX "Davomat_belgilaganTeacherId_sana_idx" ON "Davomat"("belgilaganTeacherId", "sana");
