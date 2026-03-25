function parsePagination(query, { defaultLimit, maxLimit }) {
  const parsedPage = Number.parseInt(query.page, 10);
  const parsedLimit = Number.parseInt(query.limit, 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, maxLimit)
    : defaultLimit;
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

async function executeListAdvancePayments({ deps, query }) {
  const { prisma, ensureMainOrganization } = deps;
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const where = {
      organizationId: org.id,
      ...(query.periodMonth ? { periodMonth: query.periodMonth } : {}),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
    };

    const [items, total] = await Promise.all([
      tx.advancePayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              user: { select: { username: true } },
            },
          },
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              user: { select: { username: true } },
            },
          },
          createdByUser: { select: { id: true, username: true } },
        },
      }),
      tx.advancePayment.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      advances: items,
    };
  });
}

async function executeCreateAdvancePayment({ deps, body, actorUserId, req }) {
  const {
    prisma,
    ApiError,
    ensureMainOrganization,
    assertEmployeeExists,
    assertTeacherExists,
    ensureEmployeeForTeacher,
    getActiveRunForPeriod,
    money,
    cleanOptional,
    monthKeyFromDateValue,
    monthKeyToUtcRange,
    getOrCreatePayrollItem,
    recalculatePayrollRunAggregates,
    createAuditLog,
  } = deps;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);

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
      throw new ApiError(400, "ADVANCE_OWNER_REQUIRED", "teacherId yoki employeeId kerak");
    }

    let teacherIdForAdvance = teacher?.id || null;
    if (employee.teacher?.id) {
      if (teacherIdForAdvance && teacherIdForAdvance !== employee.teacher.id) {
        throw new ApiError(
          409,
          "ADVANCE_OWNER_MISMATCH",
          "employeeId va teacherId bir-biriga mos emas",
          { employeeId: employee.id, employeeTeacherId: employee.teacher.id, teacherId: teacherIdForAdvance },
        );
      }
      teacherIdForAdvance = employee.teacher.id;
    }

    const periodMonth = cleanOptional(body.periodMonth) || monthKeyFromDateValue(body.paidAt);
    monthKeyToUtcRange(periodMonth);
    const run = await getActiveRunForPeriod(tx, { organizationId: org.id, periodMonth });
    if (run && run.status !== "DRAFT") {
      throw new ApiError(409, "PAYROLL_RUN_LOCKED", `Bu oy uchun payroll run ${run.status} holatida`);
    }

    const amount = money(body.amount);
    const paidAt = body.paidAt || new Date();

    const advance = await tx.advancePayment.create({
      data: {
        organizationId: org.id,
        periodMonth,
        employeeId: employee.id,
        teacherId: teacherIdForAdvance,
        amount,
        paidAt,
        note: cleanOptional(body.note) || null,
        createdByUserId: actorUserId || null,
      },
    });

    let syncedRunId = null;
    if (run?.status === "DRAFT") {
      const item = await getOrCreatePayrollItem(tx, {
        organizationId: org.id,
        payrollRunId: run.id,
        employeeId: employee.id,
        teacherId: teacherIdForAdvance,
      });
      await tx.payrollLine.create({
        data: {
          organizationId: org.id,
          payrollRunId: run.id,
          payrollItemId: item.id,
          employeeId: employee.id,
          teacherId: teacherIdForAdvance,
          type: "ADVANCE_DEDUCTION",
          advancePaymentId: advance.id,
          amount: amount.neg(),
          description: cleanOptional(body.note) || "Avans ushlanmasi",
          createdByUserId: actorUserId || null,
          meta: {
            source: "ADVANCE_PAYMENT",
            advancePaymentId: advance.id,
            periodMonth,
            paidAt,
          },
        },
      });
      await recalculatePayrollRunAggregates(tx, {
        payrollRunId: run.id,
        payrollItemId: item.id,
      });
      await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          generatedAt: new Date(),
          calcVersion: { increment: 1 },
          generationSummary: {
            mode: "ADVANCE_SYNC",
            periodMonth,
            advancePaymentId: advance.id,
            syncedAt: new Date().toISOString(),
          },
        },
      });
      syncedRunId = run.id;
    }

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId: actorUserId || null,
      action: "PAYROLL_ADVANCE_CREATE",
      entityType: "ADVANCE_PAYMENT",
      entityId: advance.id,
      payrollRunId: run?.id || null,
      after: {
        periodMonth: advance.periodMonth,
        employeeId: advance.employeeId,
        teacherId: advance.teacherId,
        amount: String(advance.amount),
        paidAt: advance.paidAt,
        syncedRunId,
      },
      req,
    });

    return {
      advance,
      syncedRunId,
    };
  });
}

async function executeDeleteAdvancePayment({ deps, advanceId, actorUserId, req }) {
  const {
    prisma,
    ApiError,
    ensureMainOrganization,
    getActiveRunForPeriod,
    recalculatePayrollRunAggregates,
    createAuditLog,
  } = deps;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const advance = await tx.advancePayment.findFirst({
      where: { id: advanceId, organizationId: org.id },
      include: {
        payrollLines: {
          select: { id: true, payrollRunId: true, payrollItemId: true },
        },
      },
    });
    if (!advance) throw new ApiError(404, "ADVANCE_NOT_FOUND", "Avans topilmadi");

    const run = await getActiveRunForPeriod(tx, { organizationId: org.id, periodMonth: advance.periodMonth });
    if (run && run.status !== "DRAFT") {
      throw new ApiError(409, "PAYROLL_RUN_LOCKED", `Bu oy uchun payroll run ${run.status} holatida`);
    }

    const affectedRunIds = [...new Set((advance.payrollLines || []).map((line) => line.payrollRunId).filter(Boolean))];
    if (affectedRunIds.length) {
      const affectedRuns = await tx.payrollRun.findMany({
        where: { id: { in: affectedRunIds } },
        select: { id: true, status: true },
      });
      const lockedRun = affectedRuns.find((row) => row.status !== "DRAFT");
      if (lockedRun) {
        throw new ApiError(
          409,
          "PAYROLL_RUN_LOCKED",
          "Avans locklangan payroll run bilan bog'langan. O'chirib bo'lmaydi",
          { runId: lockedRun.id, status: lockedRun.status },
        );
      }
    }

    if (advance.payrollLines.length) {
      await tx.payrollLine.deleteMany({
        where: { id: { in: advance.payrollLines.map((line) => line.id) } },
      });
    }

    for (const runId of affectedRunIds) {
      const itemIds = [
        ...new Set(
          advance.payrollLines
            .filter((line) => line.payrollRunId === runId)
            .map((line) => line.payrollItemId)
            .filter(Boolean),
        ),
      ];
      if (itemIds.length) {
        for (const itemId of itemIds) {
          await recalculatePayrollRunAggregates(tx, {
            payrollRunId: runId,
            payrollItemId: itemId,
          });
        }
      } else {
        await recalculatePayrollRunAggregates(tx, { payrollRunId: runId });
      }
      await tx.payrollRun.update({
        where: { id: runId },
        data: {
          generatedAt: new Date(),
          calcVersion: { increment: 1 },
          generationSummary: {
            mode: "ADVANCE_SYNC",
            periodMonth: advance.periodMonth,
            deletedAdvancePaymentId: advance.id,
            syncedAt: new Date().toISOString(),
          },
        },
      });
    }

    await tx.advancePayment.delete({ where: { id: advance.id } });

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId: actorUserId || null,
      action: "PAYROLL_ADVANCE_DELETE",
      entityType: "ADVANCE_PAYMENT",
      entityId: advance.id,
      payrollRunId: run?.id || null,
      before: {
        periodMonth: advance.periodMonth,
        employeeId: advance.employeeId,
        teacherId: advance.teacherId,
        amount: String(advance.amount),
        paidAt: advance.paidAt,
      },
      after: { affectedRunIds },
      req,
    });

    return { ok: true, affectedRunIds };
  });
}

module.exports = {
  executeListAdvancePayments,
  executeCreateAdvancePayment,
  executeDeleteAdvancePayment,
};
