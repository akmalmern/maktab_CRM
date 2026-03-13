async function executePayPayrollItem({ deps, runId, itemId, body, actorUserId, req }) {
  const {
    prisma,
    DECIMAL_ZERO,
    ApiError,
    money,
    cleanOptional,
    clampPaidAmountToPayable,
    getPayrollItemPaymentStatus,
    ensureMainOrganization,
    lockPayrollRunRow,
    getPayrollRunOrThrow,
    assertRunStatus,
    lockPayrollItemRow,
    createPayrollCashEntry,
    createAuditLog,
  } = deps;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    await lockPayrollRunRow(tx, { runId, organizationId: org.id });
    const run = await getPayrollRunOrThrow(tx, { runId, organizationId: org.id });
    assertRunStatus(run, ["APPROVED"]);
    await lockPayrollItemRow(tx, { itemId, runId: run.id, organizationId: org.id });

    const item = await tx.payrollItem.findFirst({
      where: { id: itemId, payrollRunId: run.id, organizationId: org.id },
      select: {
        id: true,
        employeeId: true,
        teacherId: true,
        payableAmount: true,
        paidAmount: true,
        paymentStatus: true,
      },
    });
    if (!item) throw new ApiError(404, "PAYROLL_ITEM_NOT_FOUND", "Payroll item topilmadi");

    const payable = money(item.payableAmount);
    if (payable.lte(DECIMAL_ZERO)) {
      throw new ApiError(409, "PAYROLL_ITEM_NOT_PAYABLE", "Bu item bo'yicha to'lanadigan summa yo'q");
    }
    const currentPaidAmount = clampPaidAmountToPayable(item.paidAmount, payable);
    const remaining = money(payable.minus(currentPaidAmount));
    if (remaining.lte(DECIMAL_ZERO)) {
      throw new ApiError(409, "PAYROLL_ITEM_ALREADY_PAID", "Bu item allaqachon to'langan");
    }

    const paymentAmount = body.amount === undefined ? remaining : money(body.amount);
    if (paymentAmount.lte(DECIMAL_ZERO)) {
      throw new ApiError(400, "PAYROLL_ITEM_PAY_INVALID_AMOUNT", "To'lov summasi 0 dan katta bo'lishi kerak");
    }
    if (paymentAmount.gt(remaining)) {
      throw new ApiError(
        409,
        "PAYROLL_ITEM_PAY_AMOUNT_EXCEEDED",
        "To'lov summasi qolgan summadan oshmasligi kerak",
        { remaining: String(remaining), attemptedAmount: String(paymentAmount) },
      );
    }

    const paidAt = body.paidAt || new Date();
    const nextPaidAmount = money(currentPaidAmount.plus(paymentAmount));
    const paymentStatus = getPayrollItemPaymentStatus({
      paidAmount: nextPaidAmount,
      payableAmount: payable,
    });

    const updatedItem = await tx.payrollItem.update({
      where: { id: item.id },
      data: {
        paidAmount: nextPaidAmount,
        paymentStatus,
      },
    });

    const payment = await tx.payrollItemPayment.create({
      data: {
        organizationId: org.id,
        payrollRunId: run.id,
        payrollItemId: item.id,
        employeeId: item.employeeId,
        teacherId: item.teacherId,
        amount: paymentAmount,
        paymentMethod: body.paymentMethod,
        paidAt,
        externalRef: cleanOptional(body.externalRef) || null,
        note: cleanOptional(body.note) || null,
        createdByUserId: actorUserId || null,
      },
    });

    await createPayrollCashEntry(tx, {
      organizationId: org.id,
      payrollRunId: run.id,
      payrollItemId: item.id,
      payrollItemPaymentId: payment.id,
      amount: paymentAmount.neg(),
      paymentMethod: body.paymentMethod,
      occurredAt: paidAt,
      externalRef: body.externalRef,
      note: body.note,
      createdByUserId: actorUserId || null,
      meta: {
        source: "PAYROLL_ITEM_PAY",
        payrollRunId: run.id,
        payrollItemId: item.id,
      },
    });

    const runItemsAfterPayment = await tx.payrollItem.findMany({
      where: {
        payrollRunId: run.id,
        organizationId: org.id,
      },
      select: {
        payableAmount: true,
        paidAmount: true,
      },
    });
    const pendingItems = runItemsAfterPayment.filter((row) => (
      getPayrollItemPaymentStatus({
        paidAmount: row.paidAmount,
        payableAmount: row.payableAmount,
      }) !== "PAID"
    )).length;

    let updatedRun = run;
    if (pendingItems === 0) {
      updatedRun = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: "PAID",
          paidAt,
          paidByUserId: actorUserId || null,
          paymentNote: cleanOptional(body.note) || run.paymentNote || null,
        },
      });
      await createAuditLog(tx, {
        organizationId: org.id,
        actorUserId,
        action: "PAYROLL_RUN_PAY_AUTO_COMPLETE",
        entityType: "PAYROLL_RUN",
        entityId: run.id,
        payrollRunId: run.id,
        before: { status: run.status },
        after: { status: updatedRun.status, paidAt: updatedRun.paidAt },
        req,
      });
    }

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_ITEM_PAY",
      entityType: "PAYROLL_ITEM",
      entityId: item.id,
      payrollRunId: run.id,
      before: {
        paidAmount: String(currentPaidAmount),
        paymentStatus: item.paymentStatus,
      },
      after: {
        paymentId: payment.id,
        amount: String(payment.amount),
        paidAmount: String(updatedItem.paidAmount),
        paymentStatus: updatedItem.paymentStatus,
        paymentMethod: payment.paymentMethod,
      },
      req,
    });

    return {
      run: updatedRun,
      item: updatedItem,
      payment,
      remainingAmount: money(payable.minus(nextPaidAmount)),
      autoCompletedRun: pendingItems === 0,
    };
  });
}

module.exports = {
  executePayPayrollItem,
};
