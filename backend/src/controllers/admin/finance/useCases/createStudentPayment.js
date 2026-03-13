const {
  buildStudentPaymentDraftContext,
  buildPaymentAllocationPreview,
  mapPaymentAllocations,
} = require("./studentPaymentShared");

async function executeCreateStudentPayment({
  deps,
  actor,
  studentId,
  settings,
  startMonth,
  turi,
  requestedMonthsRaw,
  requestedSumma,
  idempotencyKey,
  izoh,
}) {
  const {
    Prisma,
    prisma,
    ApiError,
    ensureManagerCanAccessStudent,
    syncStudentOyMajburiyatlar,
    readTarifChargeableMonths,
    readTarifTolovOylarSoni,
    readTarifBillingCalendar,
    safeFormatMonthKey,
  } = deps;

  if (actor?.role === "MANAGER") {
    await ensureManagerCanAccessStudent({
      managerUserId: actor.sub,
      studentId,
    });
  }

  const { oylarSoni, draftPlans } = await buildStudentPaymentDraftContext({
    deps,
    prismaClient: prisma,
    studentId,
    settings,
    startMonth,
    turi,
    requestedMonthsRaw,
  });

  let paymentResult;
  try {
    paymentResult = await prisma.$transaction(async (tx) => {
      const allocationPreview = await buildPaymentAllocationPreview({
        deps,
        prismaClient: tx,
        studentId,
        draftPlans,
        requestedSumma,
        throwOnAlreadyPaid: true,
      });
      const allocations = allocationPreview.allocations;
      const appliedMonthKeys = allocationPreview.appliedMonthKeys;

      const created = await tx.tolovTranzaksiya.create({
        data: {
          studentId,
          adminUserId: actor.sub,
          turi,
          summa: allocationPreview.finalSumma,
          izoh: izoh || null,
          idempotencyKey,
          tarifVersionId: settings.faolTarifId || null,
          tarifSnapshot: {
            oylikSumma: settings.oylikSumma,
            yillikSumma: settings.yillikSumma,
            tolovOylarSoni: readTarifTolovOylarSoni(settings),
            billingCalendar: readTarifBillingCalendar(settings),
            faolTarifId: settings.faolTarifId || null,
          },
        },
      });

      const inserted = await tx.tolovQoplama.createMany({
        data: allocations.map((month) => ({
          studentId,
          tranzaksiyaId: created.id,
          yil: month.yil,
          oy: month.oy,
          summa: Number(month.qoplamaSumma || 0),
        })),
      });

      if (inserted.count !== allocations.length) {
        throw new ApiError(
          409,
          "PAYMENT_MONTH_CONFLICT",
          "Tanlangan oylarning bir qismi boshqa to'lov bilan yopilgan. Sahifani yangilang va qayta urinib ko'ring.",
        );
      }

      await syncStudentOyMajburiyatlar({
        prismaClient: tx,
        studentIds: [studentId],
        oylikSumma: settings.oylikSumma,
        futureMonths: 3,
        chargeableMonths: readTarifChargeableMonths(settings),
      });

      return {
        transactionId: created.id,
        appliedMonthKeys,
        allocations,
        expectedSumma: allocationPreview.expectedSumma,
        finalSumma: allocationPreview.finalSumma,
        fullyDiscountedMonths: allocationPreview.fullyDiscountedMonths,
      };
    });
  } catch (error) {
    if (
      idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ApiError(
        409,
        "PAYMENT_DUPLICATE_REQUEST",
        "To'lov so'rovi takror yuborildi. Sahifani yangilang yoki bir necha soniyadan keyin qayta urinib ko'ring.",
      );
    }
    throw error;
  }

  return {
    transactionId: paymentResult.transactionId,
    appliedMonths: paymentResult.appliedMonthKeys,
    appliedMonthsFormatted: paymentResult.appliedMonthKeys.map(safeFormatMonthKey),
    qismanTolov: paymentResult.finalSumma < paymentResult.expectedSumma,
    allocations: mapPaymentAllocations(
      paymentResult.allocations,
      safeFormatMonthKey,
    ),
    skippedDiscountedMonths: paymentResult.fullyDiscountedMonths,
    skippedDiscountedMonthsFormatted: paymentResult.fullyDiscountedMonths.map(
      safeFormatMonthKey,
    ),
    summa: paymentResult.finalSumma,
    expectedSumma: paymentResult.expectedSumma,
    oylarSoni,
    turi,
  };
}

module.exports = {
  executeCreateStudentPayment,
};
