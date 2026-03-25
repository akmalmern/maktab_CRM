async function executeAddPayrollAdjustment({
  deps,
  runId,
  body,
  actorUserId,
  req,
}) {
  const {
    prisma,
    ApiError,
    ensureMainOrganization,
    getPayrollRunOrThrow,
    assertRunStatus,
    assertEmployeeExists,
    assertTeacherExists,
    ensureEmployeeForTeacher,
    getOrCreatePayrollItem,
    money,
    recalculatePayrollRunAggregates,
    createAuditLog,
  } = deps;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const run = await getPayrollRunOrThrow(tx, { runId, organizationId: org.id });
    assertRunStatus(run, ["DRAFT"]);

    let employee = null;
    let teacher = null;

    if (body.employeeId) {
      employee = await assertEmployeeExists(tx, { employeeId: body.employeeId, organizationId: org.id });
    }
    if (body.teacherId) {
      teacher = await assertTeacherExists(tx, body.teacherId);
    }

    if (!employee && teacher) {
      const ensured = await ensureEmployeeForTeacher(tx, {
        teacherId: teacher.id,
        organizationId: org.id,
      });
      employee = ensured.employee;
      teacher = teacher || ensured.teacher;
    }

    if (!employee) {
      throw new ApiError(400, "PAYROLL_ADJUSTMENT_OWNER_REQUIRED", "teacherId yoki employeeId kerak");
    }

    let teacherIdForLine = teacher?.id || null;
    if (employee.teacher?.id) {
      if (teacherIdForLine && teacherIdForLine !== employee.teacher.id) {
        throw new ApiError(
          409,
          "PAYROLL_ADJUSTMENT_OWNER_MISMATCH",
          "employeeId va teacherId bir-biriga mos emas",
          { employeeId: employee.id, employeeTeacherId: employee.teacher.id, teacherId: teacherIdForLine },
        );
      }
      teacherIdForLine = employee.teacher.id;
    }

    const item = await getOrCreatePayrollItem(tx, {
      organizationId: org.id,
      payrollRunId: run.id,
      teacherId: teacherIdForLine,
      employeeId: employee.id,
    });

    let signedAmount = money(body.amount);
    if (body.type === "PENALTY") signedAmount = signedAmount.neg();

    const line = await tx.payrollLine.create({
      data: {
        organizationId: org.id,
        payrollRunId: run.id,
        payrollItemId: item.id,
        employeeId: employee.id,
        teacherId: teacherIdForLine,
        type: body.type,
        amount: signedAmount,
        description: body.description,
        createdByUserId: actorUserId || null,
      },
    });

    await recalculatePayrollRunAggregates(tx, {
      payrollRunId: run.id,
      payrollItemId: item.id,
    });

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_MANUAL_ADJUSTMENT_ADD",
      entityType: "PAYROLL_LINE",
      entityId: line.id,
      payrollRunId: run.id,
      after: {
        employeeId: line.employeeId,
        teacherId: line.teacherId,
        type: line.type,
        amount: String(line.amount),
        description: line.description,
      },
      req,
    });

    return { line };
  });
}

async function executeDeletePayrollAdjustment({
  deps,
  runId,
  lineId,
  actorUserId,
  req,
}) {
  const {
    prisma,
    ApiError,
    ensureMainOrganization,
    getPayrollRunOrThrow,
    assertRunStatus,
    MANUAL_ADJUSTMENT_TYPES,
    recalculatePayrollRunAggregates,
    createAuditLog,
  } = deps;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const run = await getPayrollRunOrThrow(tx, { runId, organizationId: org.id });
    assertRunStatus(run, ["DRAFT"]);

    const line = await tx.payrollLine.findFirst({
      where: { id: lineId, payrollRunId: run.id, organizationId: org.id },
      select: {
        id: true,
        payrollItemId: true,
        type: true,
        amount: true,
        description: true,
        teacherId: true,
        employeeId: true,
      },
    });
    if (!line) throw new ApiError(404, "PAYROLL_LINE_NOT_FOUND", "Payroll line topilmadi");
    if (!MANUAL_ADJUSTMENT_TYPES.has(line.type)) {
      throw new ApiError(409, "PAYROLL_LINE_DELETE_FORBIDDEN", "Faqat manual adjustment line ni o'chirish mumkin");
    }

    await tx.payrollLine.delete({ where: { id: line.id } });
    await recalculatePayrollRunAggregates(tx, {
      payrollRunId: run.id,
      payrollItemId: line.payrollItemId || null,
    });

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_MANUAL_ADJUSTMENT_DELETE",
      entityType: "PAYROLL_LINE",
      entityId: line.id,
      payrollRunId: run.id,
      before: {
        employeeId: line.employeeId,
        teacherId: line.teacherId,
        type: line.type,
        amount: String(line.amount),
        description: line.description,
      },
      req,
    });

    return { ok: true };
  });
}

module.exports = {
  executeAddPayrollAdjustment,
  executeDeletePayrollAdjustment,
};
