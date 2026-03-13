function getPaymentRequestInput({
  body = {},
  fallbackStartMonth,
}) {
  const startMonth = body.startMonth || fallbackStartMonth;
  const turi = body.turi;
  const requestedMonthsRaw = Number.parseInt(String(body.oylarSoni ?? ""), 10);
  const hasRawSumma =
    body.summa !== undefined &&
    body.summa !== null &&
    String(body.summa).trim() !== "";
  const hasRequestedSumma = hasRawSumma && Number.isFinite(Number(body.summa));
  const requestedSumma = hasRequestedSumma ? Number(body.summa) : null;
  const idempotencyKey =
    body.idempotencyKey && String(body.idempotencyKey).trim()
      ? String(body.idempotencyKey).trim()
      : null;

  return {
    startMonth,
    turi,
    requestedMonthsRaw,
    requestedSumma,
    idempotencyKey,
  };
}

function getPartialRevertRequestInput(body = {}) {
  const refundSumma = Number(body.summa);
  const sabab =
    body.sabab && String(body.sabab).trim() ? String(body.sabab).trim() : null;
  return { refundSumma, sabab };
}

async function buildStudentPaymentDraftContext({
  deps,
  prismaClient,
  studentId,
  settings,
  startMonth,
  turi,
  requestedMonthsRaw,
}) {
  const {
    ApiError,
    monthKeyFromDate,
    monthKeyToSerial,
    startOfMonthUtc,
    getTashkentLocalMonthStartDateUtc,
    readTarifChargeableMonths,
    buildImtiyozMonthMap,
    resolvePaymentPlan,
    safeFormatMonthKey,
    fetchStudentPaymentDraftStudent,
    fetchStudentImtiyozRows,
  } = deps;

  const student = await fetchStudentPaymentDraftStudent({
    prismaClient,
    studentId,
  });
  if (!student) {
    throw new ApiError(404, "STUDENT_NOT_FOUND", "Student topilmadi");
  }
  if (!student.enrollments.length) {
    throw new ApiError(
      400,
      "ENROLLMENT_REQUIRED",
      "Student faol sinfga biriktirilmagan",
    );
  }

  const enrollmentStartMonth = monthKeyFromDate(
    startOfMonthUtc(
      new Date(student.enrollments?.[0]?.startDate || student.createdAt),
    ),
  );
  const enrollmentStartSerial = monthKeyToSerial(enrollmentStartMonth);
  const maxFutureMonths = 3;
  const maxAllowedMonthKey = monthKeyFromDate(
    getTashkentLocalMonthStartDateUtc(maxFutureMonths),
  );
  const maxAllowedSerial = monthKeyToSerial(maxAllowedMonthKey);

  const imtiyozRows = await fetchStudentImtiyozRows({ prismaClient, studentId });
  const imtiyozMonthMap = buildImtiyozMonthMap({
    imtiyozlar: imtiyozRows,
    oylikSumma: settings.oylikSumma,
  });
  const { oylarSoni, monthPlans: draftPlans } = resolvePaymentPlan({
    turi,
    startMonth,
    oylarSoniRaw: requestedMonthsRaw,
    monthAmountByKey: imtiyozMonthMap,
    defaultMonthAmount: settings.oylikSumma,
  });
  const chargeableMonths = readTarifChargeableMonths(settings);
  const chargeableMonthSet = new Set(chargeableMonths);
  const normalizedDraftPlans = draftPlans.map((item) =>
    chargeableMonthSet.has(Number(item.oy))
      ? item
      : {
          ...item,
          oySumma: 0,
        },
  );

  const invalidBeforeEnrollment = [];
  const invalidFuture = [];
  for (const item of normalizedDraftPlans) {
    const serial = monthKeyToSerial(item.key);
    if (
      serial === null ||
      enrollmentStartSerial === null ||
      serial < enrollmentStartSerial
    ) {
      invalidBeforeEnrollment.push(item.key);
      continue;
    }
    if (maxAllowedSerial !== null && serial > maxAllowedSerial) {
      invalidFuture.push(item.key);
    }
  }

  if (invalidBeforeEnrollment.length || invalidFuture.length) {
    throw new ApiError(
      400,
      "PAYMENT_MONTH_RANGE_INVALID",
      "Tanlangan oylarning bir qismi to'lov oralig'idan tashqarida",
      {
        enrollmentStartMonth,
        enrollmentStartMonthFormatted: safeFormatMonthKey(enrollmentStartMonth),
        maxAllowedMonth: maxAllowedMonthKey,
        maxAllowedMonthFormatted: safeFormatMonthKey(maxAllowedMonthKey),
        invalidBeforeEnrollment,
        invalidBeforeEnrollmentFormatted: invalidBeforeEnrollment.map(
          safeFormatMonthKey,
        ),
        invalidFutureMonths: invalidFuture,
        invalidFutureMonthsFormatted: invalidFuture.map(safeFormatMonthKey),
      },
    );
  }

  return {
    student,
    oylarSoni,
    draftPlans: normalizedDraftPlans,
    enrollmentStartMonth,
    maxAllowedMonthKey,
    chargeableMonths,
  };
}

async function buildPaymentAllocationPreview({
  deps,
  prismaClient,
  studentId,
  draftPlans,
  requestedSumma,
  throwOnAlreadyPaid = false,
}) {
  const {
    ApiError,
    resolvePaymentAmount,
    safeFormatMonthKey,
    fetchStudentPaymentCoverageRows,
  } = deps;

  const months = draftPlans.map((month) => ({ yil: month.yil, oy: month.oy }));
  const existing = await fetchStudentPaymentCoverageRows({
    prismaClient,
    studentId,
    months,
  });

  const existingAmountMap = new Map();
  for (const row of existing) {
    const key = `${row.yil}-${String(row.oy).padStart(2, "0")}`;
    existingAmountMap.set(
      key,
      Number(existingAmountMap.get(key) || 0) + Number(row.summa || 0),
    );
  }

  const monthPlans = draftPlans.map((month) => ({
    ...month,
    paidSumma: Number(existingAmountMap.get(month.key) || 0),
  }));
  const monthPlansWithRemaining = monthPlans.map((month) => {
    const remainingSumma = Math.max(
      0,
      Number(month.oySumma || 0) - Number(month.paidSumma || 0),
    );
    return {
      ...month,
      remainingSumma,
      isPaid: remainingSumma <= 0,
      isPartial: remainingSumma > 0 && Number(month.paidSumma || 0) > 0,
    };
  });

  const fullyDiscountedMonths = monthPlansWithRemaining
    .filter((month) => month.oySumma <= 0)
    .map((month) => month.key);

  const alreadyPaidMonthRows = monthPlansWithRemaining.filter(
    (month) => month.isPaid,
  );
  if (throwOnAlreadyPaid && alreadyPaidMonthRows.length) {
    throw new ApiError(
      409,
      "PAYMENT_MONTH_ALREADY_COVERED",
      "Tanlangan oylarning bir qismi oldin to'langan. Oylarni qayta tanlang.",
      {
        alreadyPaidMonths: alreadyPaidMonthRows.map((month) => month.key),
        alreadyPaidMonthsFormatted: alreadyPaidMonthRows.map((month) =>
          safeFormatMonthKey(month.key),
        ),
      },
    );
  }

  const appliedMonths = monthPlansWithRemaining.filter(
    (month) => month.remainingSumma > 0,
  );
  if (throwOnAlreadyPaid && !appliedMonths.length) {
    throw new ApiError(
      400,
      "PAYMENT_NOT_REQUIRED",
      "Tanlangan oylar imtiyoz bilan yopilgan, to'lov talab qilinmaydi",
      {
        fullyDiscountedMonths,
        fullyDiscountedMonthsFormatted: fullyDiscountedMonths.map(
          safeFormatMonthKey,
        ),
      },
    );
  }

  const expectedSumma = appliedMonths.reduce(
    (acc, row) => acc + Number(row.remainingSumma || 0),
    0,
  );
  const finalSumma = resolvePaymentAmount({
    expectedSumma,
    requestedSumma,
  });

  let remainingToAllocate = finalSumma;
  const allocations = [];
  for (const month of appliedMonths) {
    if (remainingToAllocate <= 0) break;
    const allocate = Math.min(
      Number(month.remainingSumma || 0),
      Number(remainingToAllocate || 0),
    );
    if (allocate <= 0) continue;
    allocations.push({
      ...month,
      qoplamaSumma: allocate,
    });
    remainingToAllocate -= allocate;
  }

  if (throwOnAlreadyPaid && (!allocations.length || remainingToAllocate < 0)) {
    throw new ApiError(
      400,
      "PAYMENT_ALLOCATION_FAILED",
      "To'lov summasini oylar bo'yicha taqsimlab bo'lmadi",
    );
  }

  return {
    monthPlansWithRemaining,
    fullyDiscountedMonths,
    alreadyPaidMonths: alreadyPaidMonthRows.map((month) => month.key),
    alreadyPaidMonthRows,
    appliedMonths,
    expectedSumma,
    finalSumma,
    allocations,
    remainingToAllocate,
    appliedMonthKeys: allocations.map((month) => month.key),
  };
}

function mapPaymentAllocations(allocations, safeFormatMonthKey) {
  return allocations.map((month) => ({
    key: month.key,
    yil: month.yil,
    oy: month.oy,
    oyLabel: safeFormatMonthKey(month.key),
    oldinTolangan: Number(month.paidSumma || 0),
    oyJami: Number(month.oySumma || 0),
    qoldiq: Number(month.remainingSumma || 0),
    tushganSumma: Number(month.qoplamaSumma || 0),
  }));
}

module.exports = {
  getPaymentRequestInput,
  getPartialRevertRequestInput,
  buildStudentPaymentDraftContext,
  buildPaymentAllocationPreview,
  mapPaymentAllocations,
};
