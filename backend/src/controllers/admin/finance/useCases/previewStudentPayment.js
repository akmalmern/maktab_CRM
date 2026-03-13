const {
  buildStudentPaymentDraftContext,
  buildPaymentAllocationPreview,
  mapPaymentAllocations,
} = require("./studentPaymentShared");

async function executePreviewStudentPayment({
  deps,
  actor,
  studentId,
  settings,
  startMonth,
  turi,
  requestedMonthsRaw,
  requestedSumma,
}) {
  const {
    ensureManagerCanAccessStudent,
    prisma,
    safeFormatMonthKey,
  } = deps;

  if (actor?.role === "MANAGER") {
    await ensureManagerCanAccessStudent({
      managerUserId: actor.sub,
      studentId,
    });
  }

  const {
    oylarSoni,
    draftPlans,
    enrollmentStartMonth,
    maxAllowedMonthKey,
    chargeableMonths,
  } = await buildStudentPaymentDraftContext({
    deps,
    prismaClient: prisma,
    studentId,
    settings,
    startMonth,
    turi,
    requestedMonthsRaw,
  });
  const allocationPreview = await buildPaymentAllocationPreview({
    deps,
    prismaClient: prisma,
    studentId,
    draftPlans,
    requestedSumma,
    throwOnAlreadyPaid: false,
  });

  return {
    studentId,
    turi,
    startMonth,
    oylarSoni,
    monthsToClose: draftPlans.map((month) => month.key),
    previewMonthsCount: draftPlans.length,
    expectedSumma: allocationPreview.expectedSumma,
    finalSumma: allocationPreview.finalSumma,
    qismanTolov: allocationPreview.finalSumma < allocationPreview.expectedSumma,
    requestedSumma,
    canSubmit:
      allocationPreview.appliedMonths.length > 0 &&
      allocationPreview.allocations.length > 0 &&
      allocationPreview.remainingToAllocate >= 0,
    alreadyPaidMonths: allocationPreview.alreadyPaidMonths,
    alreadyPaidMonthsFormatted: allocationPreview.alreadyPaidMonths.map(
      safeFormatMonthKey,
    ),
    fullyDiscountedMonths: allocationPreview.fullyDiscountedMonths,
    fullyDiscountedMonthsFormatted: allocationPreview.fullyDiscountedMonths.map(
      safeFormatMonthKey,
    ),
    appliedMonths: allocationPreview.appliedMonthKeys,
    appliedMonthsFormatted: allocationPreview.appliedMonthKeys.map(
      safeFormatMonthKey,
    ),
    allocations: mapPaymentAllocations(
      allocationPreview.allocations,
      safeFormatMonthKey,
    ).map((row) => ({
      ...row,
      isPartialMonth: Boolean(
        allocationPreview.allocations.find((item) => item.key === row.key)
          ?.isPartial,
      ),
    })),
    enrollmentStartMonth,
    enrollmentStartMonthFormatted: safeFormatMonthKey(enrollmentStartMonth),
    maxAllowedMonth: maxAllowedMonthKey,
    maxAllowedMonthFormatted: safeFormatMonthKey(maxAllowedMonthKey),
    chargeableMonths,
  };
}

module.exports = {
  executePreviewStudentPayment,
};
