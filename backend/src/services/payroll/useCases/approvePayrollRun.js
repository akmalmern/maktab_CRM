async function executeApprovePayrollRun({ deps, runId, actorUserId, req }) {
  const {
    prisma,
    ensureMainOrganization,
    getPayrollRunOrThrow,
    assertRunStatus,
    createAuditLog,
    ApiError,
  } = deps;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const run = await getPayrollRunOrThrow(tx, { runId, organizationId: org.id });
    assertRunStatus(run, ["DRAFT"]);
    const lineCount = await tx.payrollLine.count({ where: { payrollRunId: run.id } });
    if (!lineCount) throw new ApiError(409, "PAYROLL_EMPTY", "Bo'sh payroll run ni tasdiqlab bo'lmaydi");
    const updated = await tx.payrollRun.update({
      where: { id: run.id },
      data: { status: "APPROVED", approvedAt: new Date(), approvedByUserId: actorUserId },
    });
    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_RUN_APPROVE",
      entityType: "PAYROLL_RUN",
      entityId: run.id,
      payrollRunId: run.id,
      before: { status: run.status },
      after: { status: updated.status, approvedAt: updated.approvedAt },
      req,
    });
    return { run: updated };
  });
}

module.exports = {
  executeApprovePayrollRun,
};
