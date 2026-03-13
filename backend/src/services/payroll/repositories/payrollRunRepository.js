async function getActiveRunForPeriod(tx, { organizationId, periodMonth, activeStatuses, ApiError }) {
  const runs = await tx.payrollRun.findMany({
    where: {
      organizationId,
      periodMonth,
      status: { in: activeStatuses },
    },
    orderBy: { createdAt: "desc" },
    take: 2,
  });
  if (runs.length > 1) {
    throw new ApiError(
      409,
      "PAYROLL_RUN_PERIOD_CONFLICT",
      "Bir oy uchun bir nechta aktiv payroll run topildi. Data integrity tekshiring",
    );
  }
  return runs[0] || null;
}

async function lockPayrollPeriodScope(tx, { organizationId, periodMonth }) {
  await tx.$executeRaw`
    SELECT id
    FROM "PayrollRun"
    WHERE "organizationId" = ${organizationId}
      AND "periodMonth" = ${periodMonth}
    FOR UPDATE
  `;
  const advisoryKey = `payroll:period:${organizationId}:${periodMonth}`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${advisoryKey}))`;
}

async function getPayrollRunOrThrow(tx, { runId, organizationId, ApiError }) {
  const run = await tx.payrollRun.findFirst({
    where: { id: runId, organizationId },
  });
  if (!run) throw new ApiError(404, "PAYROLL_RUN_NOT_FOUND", "Payroll run topilmadi");
  return run;
}

async function lockPayrollRunRow(tx, { runId, organizationId }) {
  await tx.$executeRaw`
    SELECT id
    FROM "PayrollRun"
    WHERE id = ${runId} AND "organizationId" = ${organizationId}
    FOR UPDATE
  `;
}

async function lockPayrollItemRow(tx, { itemId, runId, organizationId }) {
  await tx.$executeRaw`
    SELECT id
    FROM "PayrollItem"
    WHERE id = ${itemId}
      AND "payrollRunId" = ${runId}
      AND "organizationId" = ${organizationId}
    FOR UPDATE
  `;
}

module.exports = {
  getActiveRunForPeriod,
  lockPayrollPeriodScope,
  getPayrollRunOrThrow,
  lockPayrollRunRow,
  lockPayrollItemRow,
};
