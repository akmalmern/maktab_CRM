async function executePayPayrollRun({ deps, runId, body, actorUserId, req }) {
  const {
    prisma,
    DECIMAL_ZERO,
    money,
    cleanOptional,
    clampPaidAmountToPayable,
    getPayrollItemPaymentStatus,
    ensureMainOrganization,
    lockPayrollRunRow,
    getPayrollRunOrThrow,
    assertRunStatus,
    createPayrollCashEntry,
    createAuditLog,
  } = deps;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    await lockPayrollRunRow(tx, { runId, organizationId: org.id });
    const run = await getPayrollRunOrThrow(tx, { runId, organizationId: org.id });
    assertRunStatus(run, ["APPROVED"]);
    const paidAt = body.paidAt || new Date();

    const runItems = await tx.payrollItem.findMany({
      where: { payrollRunId: run.id, organizationId: org.id },
      select: {
        id: true,
        employeeId: true,
        teacherId: true,
        payableAmount: true,
        paidAmount: true,
      },
    });

    let itemPaymentsCreated = 0;
    let paidTotal = DECIMAL_ZERO;
    for (const item of runItems) {
      const payable = money(item.payableAmount);
      const normalizedPaid = clampPaidAmountToPayable(item.paidAmount, payable);
      const remaining = money(payable.minus(normalizedPaid));
      const nextPaidAmount = clampPaidAmountToPayable(payable, payable);
      const paymentStatus = getPayrollItemPaymentStatus({
        paidAmount: nextPaidAmount,
        payableAmount: payable,
      });

      await tx.payrollItem.update({
        where: { id: item.id },
        data: {
          paidAmount: nextPaidAmount,
          paymentStatus,
        },
      });

      if (remaining.gt(DECIMAL_ZERO)) {
        const payment = await tx.payrollItemPayment.create({
          data: {
            organizationId: org.id,
            payrollRunId: run.id,
            payrollItemId: item.id,
            employeeId: item.employeeId,
            teacherId: item.teacherId,
            amount: remaining,
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
          amount: remaining.neg(),
          paymentMethod: body.paymentMethod,
          occurredAt: paidAt,
          externalRef: body.externalRef,
          note: body.note,
          createdByUserId: actorUserId || null,
          meta: {
            source: "PAYROLL_RUN_PAY",
            payrollRunId: run.id,
            payrollItemId: item.id,
          },
        });
        itemPaymentsCreated += 1;
        paidTotal = paidTotal.plus(remaining);
      }
    }

    const updated = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "PAID",
        paymentMethod: body.paymentMethod,
        paidAt,
        paidByUserId: actorUserId,
        externalRef: cleanOptional(body.externalRef) || null,
        paymentNote: cleanOptional(body.note) || null,
      },
    });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_RUN_PAY",
      entityType: "PAYROLL_RUN",
      entityId: run.id,
      payrollRunId: run.id,
      before: { status: run.status },
      after: {
        status: updated.status,
        paidAt: updated.paidAt,
        paymentMethod: updated.paymentMethod,
        externalRef: updated.externalRef,
        itemPaymentsCreated,
        paidTotal: String(money(paidTotal)),
      },
      req,
    });
    return { run: updated, itemPaymentsCreated, paidTotal: money(paidTotal) };
  });
}

module.exports = {
  executePayPayrollRun,
};
