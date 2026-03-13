async function executeFetchStudentFinanceDetail({
  deps,
  actor,
  studentId,
}) {
  const {
    ApiError,
    ensureManagerCanAccessStudent,
    findStudentFinanceProfile,
    fetchStudentFinanceMajburiyatRows,
    fetchStudentImtiyozRows,
    fetchStudentPaymentTransactions,
    summarizeDebtFromMajburiyatRows,
    mapStudentRowFromRaw,
    mapImtiyozRow,
    safeFormatMonthKey,
  } = deps;

  if (actor?.role === "MANAGER") {
    await ensureManagerCanAccessStudent({
      managerUserId: actor.sub,
      studentId,
    });
  }

  const student = await findStudentFinanceProfile({ studentId });
  if (!student) {
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  }

  const [majburiyatlar, imtiyozlar, transactions] = await Promise.all([
    fetchStudentFinanceMajburiyatRows({ studentId }),
    fetchStudentImtiyozRows({ studentId }),
    fetchStudentPaymentTransactions({ studentId }),
  ]);

  const now = new Date();
  const debtInfo = summarizeDebtFromMajburiyatRows(
    majburiyatlar.filter(
      (row) =>
        row.yil < now.getUTCFullYear() ||
        (row.yil === now.getUTCFullYear() && row.oy <= now.getUTCMonth() + 1),
    ),
  );

  return {
    student: mapStudentRowFromRaw(
      {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        username: student.user?.username,
        phone: student.user?.phone,
        classroomName: student.enrollments?.[0]?.classroom?.name,
        academicYear: student.enrollments?.[0]?.classroom?.academicYear,
      },
      debtInfo,
    ),
    majburiyatlar: majburiyatlar.map((row) => {
      const key = `${row.yil}-${String(row.oy).padStart(2, "0")}`;
      return {
        yil: row.yil,
        oy: row.oy,
        key,
        oyLabel: safeFormatMonthKey(key),
        bazaSumma: Number(row.bazaSumma || 0),
        imtiyozSumma: Number(row.imtiyozSumma || 0),
        netSumma: Number(row.netSumma || 0),
        tolanganSumma: Number(row.tolanganSumma || 0),
        qoldiqSumma: Number(row.qoldiqSumma || 0),
        holat: row.holat,
      };
    }),
    imtiyozlar: imtiyozlar.map(mapImtiyozRow),
    transactions: transactions.map((txn) => {
      const qoplanganOylar = txn.qoplamalar.map(
        (coverage) => `${coverage.yil}-${String(coverage.oy).padStart(2, "0")}`,
      );

      return {
        id: txn.id,
        turi: txn.turi,
        holat: txn.holat,
        summa: txn.summa,
        tolovSana: txn.tolovSana,
        izoh: txn.izoh || "",
        bekorSana: txn.bekorSana,
        bekorIzoh: txn.bekorIzoh || "",
        tarifVersionId: txn.tarifVersionId || null,
        tarifSnapshot: txn.tarifSnapshot || null,
        qoplanganOylar,
        qoplanganOylarFormatted: qoplanganOylar.map(safeFormatMonthKey),
        qoplamalar: txn.qoplamalar.map((coverage) => {
          const key = `${coverage.yil}-${String(coverage.oy).padStart(2, "0")}`;
          return {
            yil: coverage.yil,
            oy: coverage.oy,
            key,
            oyLabel: safeFormatMonthKey(key),
            summa: Number(coverage.summa || 0),
          };
        }),
      };
    }),
  };
}

module.exports = {
  executeFetchStudentFinanceDetail,
};
