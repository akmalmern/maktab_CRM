/*
  Warnings:

  - You are about to drop the column `chegirmaFoiz` on the `MoliyaSozlama` table. All the data in the column will be lost.
  - You are about to drop the column `chegirmaFoiz` on the `MoliyaTarifVersion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MoliyaSozlama" DROP COLUMN "chegirmaFoiz";

-- AlterTable
ALTER TABLE "MoliyaTarifVersion" DROP COLUMN "chegirmaFoiz";
