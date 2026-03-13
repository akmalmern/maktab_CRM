async function executeRecalculatePayrollRunAggregates({
  deps,
  tx,
  payrollRunId,
  payrollItemId = null,
}) {
  const {
    ApiError,
    DECIMAL_ZERO,
    money,
    decimal,
    buildItemSummaryFromLines,
    clampPaidAmountToPayable,
    getPayrollItemPaymentStatus,
  } = deps;

  const run = await tx.payrollRun.findUnique({
    where: { id: payrollRunId },
    select: { id: true, organizationId: true },
  });
  if (!run) throw new ApiError(404, "PAYROLL_RUN_NOT_FOUND", "Payroll run topilmadi");

  const itemWhere = payrollItemId
    ? { payrollRunId, id: payrollItemId }
    : { payrollRunId };
  const items = await tx.payrollItem.findMany({
    where: itemWhere,
    select: { id: true, teacherId: true, employeeId: true, paidAmount: true },
  });
  const lines = await tx.payrollLine.findMany({
    where: payrollItemId ? { payrollRunId, payrollItemId } : { payrollRunId },
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { username: true } },
        },
      },
      teacher: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { username: true } },
        },
      },
    },
  });

  const itemById = new Map(items.map((i) => [i.id, i]));
  const linesByItem = new Map();
  for (const line of lines) {
    if (!linesByItem.has(line.payrollItemId)) linesByItem.set(line.payrollItemId, []);
    linesByItem.get(line.payrollItemId).push(line);
  }

  async function updateItemSummary(item, teacherLines) {
    const summary = buildItemSummaryFromLines(teacherLines);
    const personSnap = teacherLines[0]?.employee || teacherLines[0]?.teacher || null;
    const usernameSnap =
      teacherLines[0]?.employee?.user?.username ||
      teacherLines[0]?.teacher?.user?.username ||
      null;
    const normalizedPaidAmount = clampPaidAmountToPayable(item.paidAmount, summary.payableAmount);
    const paymentStatus = getPayrollItemPaymentStatus({
      paidAmount: normalizedPaidAmount,
      payableAmount: summary.payableAmount,
    });

    await tx.payrollItem.update({
      where: { id: item.id },
      data: {
        totalMinutes: summary.totalMinutes,
        totalHours: summary.totalHours,
        grossAmount: summary.grossAmount,
        bonusAmount: summary.bonusAmount,
        penaltyAmount: summary.penaltyAmount,
        manualAmount: summary.manualAmount,
        fixedSalaryAmount: summary.fixedSalaryAmount,
        advanceDeductionAmount: summary.advanceDeductionAmount,
        adjustmentAmount: summary.adjustmentAmount,
        payableAmount: summary.payableAmount,
        paidAmount: normalizedPaidAmount,
        paymentStatus,
        lessonLineCount: summary.lessonLineCount,
        lineCount: summary.lineCount,
        teacherFirstNameSnapshot: personSnap?.firstName || null,
        teacherLastNameSnapshot: personSnap?.lastName || null,
        teacherUsernameSnapshot: usernameSnap,
        summarySnapshot: {
          totalMinutes: summary.totalMinutes,
          totalHours: String(summary.totalHours),
          grossAmount: String(summary.grossAmount),
          bonusAmount: String(summary.bonusAmount),
          penaltyAmount: String(summary.penaltyAmount),
          manualAmount: String(summary.manualAmount),
          fixedSalaryAmount: String(summary.fixedSalaryAmount),
          advanceDeductionAmount: String(summary.advanceDeductionAmount),
          adjustmentAmount: String(summary.adjustmentAmount),
          payableAmount: String(summary.payableAmount),
          paidAmount: String(normalizedPaidAmount),
          paymentStatus,
          lessonLineCount: summary.lessonLineCount,
          lineCount: summary.lineCount,
        },
      },
    });
  }

  if (payrollItemId) {
    const item = itemById.get(payrollItemId);
    if (item) {
      const teacherLines = linesByItem.get(item.id) || [];
      if (!teacherLines.length) {
        await tx.payrollItem.deleteMany({
          where: { id: item.id, payrollRunId },
        });
      } else {
        await updateItemSummary(item, teacherLines);
      }
    }
  } else {
    for (const [itemId, teacherLines] of linesByItem.entries()) {
      const item = itemById.get(itemId);
      if (!item) {
        throw new ApiError(
          500,
          "PAYROLL_ITEM_MISSING",
          "Payroll item topilmadi (data integrity)",
        );
      }
      await updateItemSummary(item, teacherLines);
    }

    const itemIdsWithLines = [...linesByItem.keys()];
    await tx.payrollItem.deleteMany({
      where: {
        payrollRunId,
        ...(itemIdsWithLines.length ? { id: { notIn: itemIdsWithLines } } : {}),
      },
    });
  }

  let sourceLessonsCount = 0;
  let teacherCount = 0;
  let grossAmount = DECIMAL_ZERO;
  let adjustmentAmount = DECIMAL_ZERO;
  let payableAmount = DECIMAL_ZERO;

  if (typeof tx.payrollItem.aggregate === "function") {
    const runAgg = await tx.payrollItem.aggregate({
      where: { payrollRunId },
      _sum: {
        lessonLineCount: true,
        grossAmount: true,
        adjustmentAmount: true,
        payableAmount: true,
      },
      _count: { _all: true },
    });
    sourceLessonsCount = Number(runAgg._sum?.lessonLineCount || 0);
    teacherCount = Number(runAgg._count?._all || 0);
    grossAmount = decimal(runAgg._sum?.grossAmount || 0);
    adjustmentAmount = decimal(runAgg._sum?.adjustmentAmount || 0);
    payableAmount = decimal(runAgg._sum?.payableAmount || 0);
  } else {
    const runItems = await tx.payrollItem.findMany({
      where: { payrollRunId },
      select: {
        lessonLineCount: true,
        grossAmount: true,
        adjustmentAmount: true,
        payableAmount: true,
      },
    });
    teacherCount = runItems.length;
    for (const item of runItems) {
      sourceLessonsCount += Number(item.lessonLineCount || 0);
      grossAmount = grossAmount.plus(decimal(item.grossAmount || 0));
      adjustmentAmount = adjustmentAmount.plus(decimal(item.adjustmentAmount || 0));
      payableAmount = payableAmount.plus(decimal(item.payableAmount || 0));
    }
  }

  await tx.payrollRun.update({
    where: { id: payrollRunId },
    data: {
      sourceLessonsCount: Number(sourceLessonsCount || 0),
      teacherCount: Number(teacherCount || 0),
      grossAmount: money(grossAmount),
      adjustmentAmount: money(adjustmentAmount),
      payableAmount: money(payableAmount),
    },
  });
}

module.exports = {
  executeRecalculatePayrollRunAggregates,
};
