async function executeDeactivateStudentImtiyoz({
  deps,
  actor,
  imtiyozId,
  sabab,
  settings,
}) {
  const {
    ApiError,
    ensureManagerCanAccessStudent,
    findStudentImtiyozById,
    monthKeyFromDate,
    monthKeyToSerial,
    buildImtiyozSnapshotRows,
    monthKeyFromParts,
    prisma,
    syncStudentOyMajburiyatlar,
    readTarifChargeableMonths,
    mapImtiyozRow,
  } = deps;

  const existing = await findStudentImtiyozById({ imtiyozId });
  if (!existing) {
    throw new ApiError(404, "IMTIYOZ_NOT_FOUND", "Imtiyoz topilmadi");
  }
  if (actor?.role === "MANAGER") {
    await ensureManagerCanAccessStudent({
      managerUserId: actor.sub,
      studentId: existing.studentId,
    });
  }
  if (!existing.isActive) {
    throw new ApiError(
      409,
      "IMTIYOZ_ALREADY_DEACTIVATED",
      "Imtiyoz allaqachon bekor qilingan",
    );
  }

  const currentMonthKey = monthKeyFromDate(new Date());
  const currentMonthSerial = monthKeyToSerial(currentMonthKey);
  const existingSnapshot =
    Array.isArray(existing.oylarSnapshot) && existing.oylarSnapshot.length
      ? existing.oylarSnapshot
      : buildImtiyozSnapshotRows({
          turi: existing.turi,
          qiymat: existing.qiymat,
          boshlanishOy: monthKeyFromParts(
            Number(existing.boshlanishYil),
            Number(existing.boshlanishOyRaqam),
          ),
          oylarSoni: existing.oylarSoni,
          oylikSumma: settings.oylikSumma,
        });
  const retainedSnapshot = existingSnapshot
    .map((entry) => {
      const key =
        typeof entry?.key === "string"
          ? entry.key
          : Number.isFinite(Number(entry?.yil)) &&
              Number.isFinite(Number(entry?.oy))
            ? `${Number(entry.yil)}-${String(Number(entry.oy)).padStart(2, "0")}`
            : null;
      const serial = monthKeyToSerial(key);
      if (!key || serial === null || serial >= currentMonthSerial) return null;
      const [yilStr, oyStr] = key.split("-");
      return {
        key,
        yil: Number(yilStr),
        oy: Number(oyStr),
        oySumma: Math.max(
          0,
          Number(entry?.oySumma ?? entry?.summa ?? entry?.amount ?? 0),
        ),
      };
    })
    .filter(Boolean);

  const updated = await prisma.tolovImtiyozi.update({
    where: { id: imtiyozId },
    data: {
      isActive: false,
      bekorQilinganAt: new Date(),
      bekorQilinganAdminUserId: actor.sub,
      bekorQilishSababi: sabab,
      oylarSnapshot: retainedSnapshot,
    },
  });

  await syncStudentOyMajburiyatlar({
    studentIds: [existing.studentId],
    oylikSumma: settings.oylikSumma,
    futureMonths: 3,
    chargeableMonths: readTarifChargeableMonths(settings),
  });

  return {
    imtiyoz: mapImtiyozRow(updated),
  };
}

module.exports = {
  executeDeactivateStudentImtiyoz,
};
