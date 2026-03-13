async function executeReversePayrollRun({ deps, runId, body, actorUserId, req }) {
  const {
    prisma,
    DECIMAL_ZERO,
    money,
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
    assertRunStatus(run, ["APPROVED", "PAID"]);
    const reversedAt = new Date();

    await tx.$executeRaw`
      SELECT id
      FROM "PayrollItem"
      WHERE "payrollRunId" = ${run.id}
        AND "organizationId" = ${org.id}
      FOR UPDATE
    `;

    const runPayments = await tx.payrollItemPayment.findMany({
      where: { payrollRunId: run.id, organizationId: org.id },
      orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        payrollItemId: true,
        employeeId: true,
        teacherId: true,
        amount: true,
        paymentMethod: true,
        externalRef: true,
      },
    });
    let reversedPaymentCount = 0;
    let reversedTotal = DECIMAL_ZERO;
    for (const payment of runPayments) {
      const paymentAmount = money(payment.amount);
      if (paymentAmount.lte(DECIMAL_ZERO)) continue;

      const reversePayment = await tx.payrollItemPayment.create({
        data: {
          organizationId: org.id,
          payrollRunId: run.id,
          payrollItemId: payment.payrollItemId,
          employeeId: payment.employeeId,
          teacherId: payment.teacherId,
          amount: paymentAmount.neg(),
          paymentMethod: payment.paymentMethod,
          paidAt: reversedAt,
          externalRef: null,
          note: `REVERSE: ${body.reason}`,
          createdByUserId: actorUserId || null,
        },
      });
      await createPayrollCashEntry(tx, {
        organizationId: org.id,
        payrollRunId: run.id,
        payrollItemId: payment.payrollItemId,
        payrollItemPaymentId: reversePayment.id,
        amount: paymentAmount,
        paymentMethod: payment.paymentMethod,
        entryType: "PAYROLL_REVERSAL",
        occurredAt: reversedAt,
        note: body.reason,
        createdByUserId: actorUserId || null,
        meta: {
          source: "PAYROLL_RUN_REVERSE",
          reversedPaymentId: payment.id,
          payrollRunId: run.id,
          payrollItemId: payment.payrollItemId,
        },
      });
      reversedPaymentCount += 1;
      reversedTotal = reversedTotal.plus(paymentAmount);
    }

    const runItems = await tx.payrollItem.findMany({
      where: { payrollRunId: run.id, organizationId: org.id },
      select: { id: true, payableAmount: true },
    });
    for (const item of runItems) {
      await tx.payrollItem.update({
        where: { id: item.id },
        data: {
          paidAmount: DECIMAL_ZERO,
          paymentStatus: getPayrollItemPaymentStatus({
            paidAmount: DECIMAL_ZERO,
            payableAmount: item.payableAmount,
          }),
        },
      });
    }

    const updated = await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        status: "REVERSED",
        reversedAt,
        reversedByUserId: actorUserId,
        reverseReason: body.reason,
      },
    });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_RUN_REVERSE",
      entityType: "PAYROLL_RUN",
      entityId: run.id,
      payrollRunId: run.id,
      before: { status: run.status, paidAt: run.paidAt, paymentMethod: run.paymentMethod },
      after: {
        status: updated.status,
        reversedAt: updated.reversedAt,
        reverseReason: updated.reverseReason,
        reversedPaymentCount,
        reversedTotal: String(money(reversedTotal)),
      },
      reason: body.reason,
      req,
    });
    return { run: updated, reversedPaymentCount, reversedTotal: money(reversedTotal) };
  });
}

module.exports = {
  executeReversePayrollRun,
};
