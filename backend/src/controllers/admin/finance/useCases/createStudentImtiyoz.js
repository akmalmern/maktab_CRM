async function executeCreateStudentImtiyoz({
  deps,
  actor,
  studentId,
  settings,
  turi,
  qiymat,
  boshlanishOy,
  oylarSoni,
  sabab,
  izoh,
}) {
  const {
    ApiError,
    ensureManagerCanAccessStudent,
    parseImtiyozStartPartsFromKey,
    buildImtiyozSnapshotRows,
    buildMonthRange,
    findStudentBasic,
    prisma,
    syncStudentOyMajburiyatlar,
    readTarifChargeableMonths,
    mapImtiyozRow,
    safeFormatMonthKey,
  } = deps;

  if (actor?.role === "MANAGER") {
    await ensureManagerCanAccessStudent({
      managerUserId: actor.sub,
      studentId,
    });
  }

  const { boshlanishYil, boshlanishOyRaqam } =
    parseImtiyozStartPartsFromKey(boshlanishOy);
  const student = await findStudentBasic({ studentId });
  if (!student) {
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  }
  if (turi === "SUMMA" && Number(qiymat) >= Number(settings.oylikSumma)) {
    throw new ApiError(
      400,
      "IMTIYOZ_SUMMA_INVALID",
      "SUMMA imtiyoz oylik summadan kichik bo'lishi kerak. To'liq ozod uchun alohida turdan foydalaning.",
    );
  }

  const normalizedOylarSoni = Number(oylarSoni || 1);
  const snapshotRows = buildImtiyozSnapshotRows({
    turi,
    qiymat: turi === "TOLIQ_OZOD" ? null : Number(qiymat),
    boshlanishOy,
    oylarSoni: normalizedOylarSoni,
    oylikSumma: settings.oylikSumma,
  });

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.tolovImtiyozi.create({
      data: {
        studentId,
        adminUserId: actor.sub,
        turi,
        qiymat: turi === "TOLIQ_OZOD" ? null : Number(qiymat),
        boshlanishYil,
        boshlanishOyRaqam,
        oylarSoni: normalizedOylarSoni,
        oylarSnapshot: snapshotRows,
        sabab,
        izoh: izoh || null,
      },
    });

    let appliedMonthKeys = [];
    if (turi === "TOLIQ_OZOD") {
      const months = buildMonthRange(boshlanishOy, normalizedOylarSoni);
      appliedMonthKeys = months.map(
        (month) => `${month.yil}-${String(month.oy).padStart(2, "0")}`,
      );
    }

    return { created, appliedMonthKeys };
  });

  await syncStudentOyMajburiyatlar({
    studentIds: [studentId],
    oylikSumma: settings.oylikSumma,
    futureMonths: 3,
    chargeableMonths: readTarifChargeableMonths(settings),
  });

  return {
    imtiyoz: mapImtiyozRow(result.created),
    appliedMonthKeys: result.appliedMonthKeys,
    appliedMonthKeysFormatted: result.appliedMonthKeys.map(safeFormatMonthKey),
  };
}

module.exports = {
  executeCreateStudentImtiyoz,
};
