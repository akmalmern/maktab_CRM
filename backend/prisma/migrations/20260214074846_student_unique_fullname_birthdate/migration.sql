/*
  Warnings:

  - You are about to drop the column `phone` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Teacher` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[firstName,lastName,birthDate]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[firstName,lastName,birthDate]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[firstName,lastName,birthDate]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "phone";

-- AlterTable
ALTER TABLE "Teacher" DROP COLUMN "phone";

-- CreateIndex
CREATE UNIQUE INDEX "Admin_firstName_lastName_birthDate_key" ON "Admin"("firstName", "lastName", "birthDate");

-- CreateIndex
CREATE UNIQUE INDEX "Student_firstName_lastName_birthDate_key" ON "Student"("firstName", "lastName", "birthDate");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_firstName_lastName_birthDate_key" ON "Teacher"("firstName", "lastName", "birthDate");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
