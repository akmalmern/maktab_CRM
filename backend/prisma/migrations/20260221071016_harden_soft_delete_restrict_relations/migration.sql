-- DropForeignKey
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_userId_fkey";

-- DropForeignKey
ALTER TABLE "Baho" DROP CONSTRAINT "Baho_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Davomat" DROP CONSTRAINT "Davomat_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Enrollment" DROP CONSTRAINT "Enrollment_studentId_fkey";

-- DropForeignKey
ALTER TABLE "FileDocument" DROP CONSTRAINT "FileDocument_adminId_fkey";

-- DropForeignKey
ALTER TABLE "FileDocument" DROP CONSTRAINT "FileDocument_studentId_fkey";

-- DropForeignKey
ALTER TABLE "FileDocument" DROP CONSTRAINT "FileDocument_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "QarzdorIzoh" DROP CONSTRAINT "QarzdorIzoh_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_userId_fkey";

-- DropForeignKey
ALTER TABLE "StudentOyMajburiyat" DROP CONSTRAINT "StudentOyMajburiyat_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Teacher" DROP CONSTRAINT "Teacher_userId_fkey";

-- DropForeignKey
ALTER TABLE "TolovImtiyozi" DROP CONSTRAINT "TolovImtiyozi_studentId_fkey";

-- DropForeignKey
ALTER TABLE "TolovQoplama" DROP CONSTRAINT "TolovQoplama_studentId_fkey";

-- DropForeignKey
ALTER TABLE "TolovTranzaksiya" DROP CONSTRAINT "TolovTranzaksiya_studentId_fkey";

-- DropIndex
DROP INDEX "Enrollment_studentId_active_unique";

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileDocument" ADD CONSTRAINT "FileDocument_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileDocument" ADD CONSTRAINT "FileDocument_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileDocument" ADD CONSTRAINT "FileDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Davomat" ADD CONSTRAINT "Davomat_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Baho" ADD CONSTRAINT "Baho_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TolovTranzaksiya" ADD CONSTRAINT "TolovTranzaksiya_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TolovQoplama" ADD CONSTRAINT "TolovQoplama_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentOyMajburiyat" ADD CONSTRAINT "StudentOyMajburiyat_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TolovImtiyozi" ADD CONSTRAINT "TolovImtiyozi_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QarzdorIzoh" ADD CONSTRAINT "QarzdorIzoh_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
