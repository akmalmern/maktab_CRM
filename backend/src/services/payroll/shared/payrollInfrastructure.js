function createPayrollInfrastructure({ ApiError, cleanOptional, mainOrgKey, mainOrgName }) {
  function buildAuditRequestMeta(req) {
    return {
      ip:
        cleanOptional(req?.headers?.["x-forwarded-for"]) ||
        cleanOptional(req?.ip) ||
        cleanOptional(req?.socket?.remoteAddress) ||
        null,
      userAgent: cleanOptional(req?.headers?.["user-agent"]) || null,
    };
  }

  async function ensureMainOrganization(tx) {
    return tx.organization.upsert({
      where: { key: mainOrgKey },
      update: {},
      create: { key: mainOrgKey, name: mainOrgName },
      select: { id: true, key: true, name: true },
    });
  }

  async function resolvePayrollRunActorUserId(tx, preferredUserId = null) {
    if (preferredUserId) return preferredUserId;
    const adminUser = await tx.user.findFirst({
      where: { role: "ADMIN", isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!adminUser) {
      throw new ApiError(
        409,
        "PAYROLL_RUN_ACTOR_REQUIRED",
        "Payroll run yaratish uchun aktiv ADMIN foydalanuvchi topilmadi",
      );
    }
    return adminUser.id;
  }

  async function createAuditLog(
    tx,
    { organizationId, actorUserId, action, entityType, entityId, payrollRunId, before, after, reason, req },
  ) {
    await tx.auditLog.create({
      data: {
        organizationId,
        actorUserId: actorUserId || null,
        action,
        entityType,
        entityId,
        payrollRunId: payrollRunId || null,
        before: before ?? null,
        after: after ?? null,
        reason: reason || null,
        ...buildAuditRequestMeta(req),
      },
    });
  }

  async function createPayrollCashEntry(
    tx,
    {
      organizationId,
      payrollRunId = null,
      payrollItemId = null,
      payrollItemPaymentId = null,
      amount,
      paymentMethod,
      entryType = "PAYROLL_PAYOUT",
      occurredAt,
      externalRef,
      note,
      createdByUserId = null,
      meta = null,
    },
  ) {
    return tx.payrollCashEntry.create({
      data: {
        organizationId,
        payrollRunId,
        payrollItemId,
        payrollItemPaymentId,
        amount,
        paymentMethod,
        entryType,
        occurredAt: occurredAt || new Date(),
        externalRef: cleanOptional(externalRef) || null,
        note: cleanOptional(note) || null,
        createdByUserId: createdByUserId || null,
        meta: meta || null,
      },
    });
  }

  function mapPayrollEmployeeConfigRow(employee) {
    return {
      id: employee.id,
      organizationId: employee.organizationId,
      userId: employee.userId,
      kind: employee.kind,
      payrollMode: employee.payrollMode,
      employmentStatus: employee.employmentStatus,
      isPayrollEligible: Boolean(employee.isPayrollEligible),
      fixedSalaryAmount: employee.fixedSalaryAmount,
      note: employee.note || null,
      firstName: employee.firstName || null,
      lastName: employee.lastName || null,
      hireDate: employee.hireDate || null,
      terminationDate: employee.terminationDate || null,
      user: employee.user
        ? {
            id: employee.user.id,
            username: employee.user.username,
            role: employee.user.role,
            isActive: Boolean(employee.user.isActive),
          }
        : null,
      teacher: employee.teacher
        ? {
            id: employee.teacher.id,
            firstName: employee.teacher.firstName,
            lastName: employee.teacher.lastName,
            subject: employee.teacher.subject || null,
          }
        : null,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }

  return {
    ensureMainOrganization,
    resolvePayrollRunActorUserId,
    createAuditLog,
    createPayrollCashEntry,
    mapPayrollEmployeeConfigRow,
  };
}

module.exports = {
  createPayrollInfrastructure,
};
