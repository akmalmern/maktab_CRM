async function executeGeneratePayrollRun({ deps, body, actorUserId, req }) {
  const {
    prisma,
    ApiError,
    DECIMAL_ZERO,
    REGENERATE_LINE_TYPES,
    money,
    cleanOptional,
    ensureMainOrganization,
    lockPayrollPeriodScope,
    getActiveRunForPeriod,
    resolvePayrollRunActorUserId,
    loadRatesForPeriod,
    ensureEmployeeForTeacher,
    isEmployeeLessonPayrollEligible,
    resolvePayrollTeacherIdForLesson,
    resolveRateForLesson,
    calcLessonAmount,
    getOrCreatePayrollItem,
    recalculatePayrollRunAggregates,
    createAuditLog,
    monthKeyToUtcRange,
  } = deps;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const { periodMonth, periodStart, periodEnd } = monthKeyToUtcRange(body.periodMonth);

    await lockPayrollPeriodScope(tx, { organizationId: org.id, periodMonth });

    let run = await getActiveRunForPeriod(tx, { organizationId: org.id, periodMonth });
    if (run && run.status !== "DRAFT") {
      throw new ApiError(409, "PAYROLL_RUN_LOCKED", `Bu oy uchun payroll run ${run.status} holatida`);
    }

    if (!run) {
      const runActorUserId = await resolvePayrollRunActorUserId(tx, actorUserId);
      run = await tx.payrollRun.create({
        data: {
          organizationId: org.id,
          periodMonth,
          periodStart,
          periodEnd,
          timezone: "Asia/Tashkent",
          status: "DRAFT",
          createdByUserId: runActorUserId,
        },
      });
      await createAuditLog(tx, {
        organizationId: org.id,
        actorUserId: runActorUserId,
        action: "PAYROLL_RUN_CREATE",
        entityType: "PAYROLL_RUN",
        entityId: run.id,
        payrollRunId: run.id,
        after: { periodMonth, periodStart, periodEnd, status: "DRAFT" },
        req,
      });
    }

    await tx.payrollLine.deleteMany({
      where: { payrollRunId: run.id, type: { in: REGENERATE_LINE_TYPES } },
    });

    const lessons = await tx.realLesson.findMany({
      where: {
        organizationId: org.id,
        status: { in: ["DONE", "REPLACED"] },
        startAt: { gte: periodStart, lt: periodEnd },
      },
      orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        teacherId: true,
        status: true,
        replacedByTeacherId: true,
        subjectId: true,
        classroomId: true,
        startAt: true,
        durationMinutes: true,
      },
    });

    const { teacherMap, subjectMap } = await loadRatesForPeriod(tx, {
      organizationId: org.id,
      lessons,
      periodStart,
      periodEnd,
    });

    const teacherEmployeeCache = new Map();
    const getLessonOwner = async (payrollTeacherId) => {
      let owner = teacherEmployeeCache.get(payrollTeacherId);
      if (!owner) {
        owner = await ensureEmployeeForTeacher(tx, {
          teacherId: payrollTeacherId,
          organizationId: org.id,
        });
        teacherEmployeeCache.set(payrollTeacherId, owner);
      }
      return owner;
    };

    const missingRateLessons = [];
    for (const lesson of lessons) {
      const payrollTeacherId = resolvePayrollTeacherIdForLesson(lesson);
      const owner = await getLessonOwner(payrollTeacherId);
      if (!isEmployeeLessonPayrollEligible(owner.employee)) continue;

      const resolved = resolveRateForLesson({
        lesson: { ...lesson, teacherId: payrollTeacherId },
        teacherRateMap: teacherMap,
        subjectDefaultRateMap: subjectMap,
      });
      if (!resolved) {
        missingRateLessons.push({
          realLessonId: lesson.id,
          teacherId: payrollTeacherId,
          sourceTeacherId: lesson.teacherId,
          status: lesson.status,
          replacedByTeacherId: lesson.replacedByTeacherId || null,
          subjectId: lesson.subjectId,
          classroomId: lesson.classroomId,
          startAt: lesson.startAt,
        });
      }
    }
    if (missingRateLessons.length) {
      throw new ApiError(
        409,
        "PAYROLL_RATE_NOT_FOUND",
        "Ba'zi darslar uchun rate topilmadi. Avval rate kiriting",
        { totalMissing: missingRateLessons.length, missingRateLessons: missingRateLessons.slice(0, 100) },
      );
    }

    const existingItems = await tx.payrollItem.findMany({
      where: { payrollRunId: run.id },
      select: { id: true, teacherId: true, employeeId: true },
    });
    const itemByTeacherCache = new Map(
      existingItems
        .filter((row) => row.teacherId)
        .map((row) => [row.teacherId, row]),
    );
    const itemByEmployeeCache = new Map(
      existingItems
        .filter((row) => row.employeeId)
        .map((row) => [row.employeeId, row]),
    );
    const setItemCache = (item) => {
      if (item?.teacherId) itemByTeacherCache.set(item.teacherId, item);
      if (item?.employeeId) itemByEmployeeCache.set(item.employeeId, item);
    };

    const lessonLineRows = [];
    for (const lesson of lessons) {
      const payrollTeacherId = resolvePayrollTeacherIdForLesson(lesson);
      const owner = await getLessonOwner(payrollTeacherId);
      if (!isEmployeeLessonPayrollEligible(owner.employee)) continue;

      let item = itemByTeacherCache.get(payrollTeacherId) || itemByEmployeeCache.get(owner.employee.id);
      if (!item) {
        item = await getOrCreatePayrollItem(tx, {
          organizationId: org.id,
          payrollRunId: run.id,
          teacherId: payrollTeacherId,
          employeeId: owner.employee.id,
        });
        setItemCache(item);
      } else if (!item.employeeId || item.employeeId !== owner.employee.id || item.teacherId !== payrollTeacherId) {
        const patch = {};
        if (!item.employeeId || item.employeeId !== owner.employee.id) patch.employeeId = owner.employee.id;
        if (item.teacherId !== payrollTeacherId) patch.teacherId = payrollTeacherId;
        item = await tx.payrollItem.update({
          where: { id: item.id },
          data: patch,
          select: { id: true, teacherId: true, employeeId: true },
        });
        setItemCache(item);
      }

      const resolved = resolveRateForLesson({
        lesson: { ...lesson, teacherId: payrollTeacherId },
        teacherRateMap: teacherMap,
        subjectDefaultRateMap: subjectMap,
      });
      const amount = calcLessonAmount(resolved.ratePerHour, lesson.durationMinutes);
      lessonLineRows.push({
        organizationId: org.id,
        payrollRunId: run.id,
        payrollItemId: item.id,
        employeeId: owner.employee.id,
        teacherId: payrollTeacherId,
        type: "LESSON",
        realLessonId: lesson.id,
        subjectId: lesson.subjectId,
        classroomId: lesson.classroomId,
        lessonStartAt: lesson.startAt,
        minutes: lesson.durationMinutes,
        ratePerHour: resolved.ratePerHour,
        amount,
        rateSource: resolved.rateSource,
        teacherRateId: resolved.teacherRateId,
        subjectDefaultRateId: resolved.subjectDefaultRateId,
        createdByUserId: actorUserId || null,
        meta: {
          resolution: { rateSource: resolved.rateSource },
          sourceTeacherId: lesson.teacherId,
          lessonStatus: lesson.status,
          replacedByTeacherId: lesson.replacedByTeacherId || null,
        },
      });
    }
    if (lessonLineRows.length) {
      await tx.payrollLine.createMany({ data: lessonLineRows });
    }

    const fixedSalaryEmployees = await tx.employee.findMany({
      where: {
        organizationId: org.id,
        isPayrollEligible: true,
        employmentStatus: "ACTIVE",
        payrollMode: { in: ["FIXED", "MIXED"] },
        fixedSalaryAmount: { gt: DECIMAL_ZERO },
        AND: [
          { OR: [{ hireDate: null }, { hireDate: { lt: periodEnd } }] },
          { OR: [{ terminationDate: null }, { terminationDate: { gte: periodStart } }] },
        ],
      },
      select: {
        id: true,
        fixedSalaryAmount: true,
        teacher: { select: { id: true } },
      },
    });

    const fixedSalaryLineRows = [];
    for (const employee of fixedSalaryEmployees) {
      const teacherId = employee.teacher?.id || null;
      let item = itemByEmployeeCache.get(employee.id) || (teacherId ? itemByTeacherCache.get(teacherId) : null);
      if (!item) {
        item = await getOrCreatePayrollItem(tx, {
          organizationId: org.id,
          payrollRunId: run.id,
          employeeId: employee.id,
          teacherId,
        });
        setItemCache(item);
      } else if ((!item.employeeId || item.employeeId !== employee.id) || (teacherId && item.teacherId !== teacherId)) {
        const patch = {};
        if (!item.employeeId || item.employeeId !== employee.id) patch.employeeId = employee.id;
        if (teacherId && item.teacherId !== teacherId) patch.teacherId = teacherId;
        item = await tx.payrollItem.update({
          where: { id: item.id },
          data: patch,
          select: { id: true, teacherId: true, employeeId: true },
        });
        setItemCache(item);
      }

      fixedSalaryLineRows.push({
        organizationId: org.id,
        payrollRunId: run.id,
        payrollItemId: item.id,
        employeeId: employee.id,
        teacherId,
        type: "FIXED_SALARY",
        amount: money(employee.fixedSalaryAmount),
        description: "Oylik oklad",
        createdByUserId: actorUserId || null,
        meta: { source: "EMPLOYEE_FIXED_SALARY" },
      });
    }
    if (fixedSalaryLineRows.length) {
      await tx.payrollLine.createMany({ data: fixedSalaryLineRows });
    }

    const advances = await tx.advancePayment.findMany({
      where: {
        organizationId: org.id,
        periodMonth,
      },
      select: {
        id: true,
        employeeId: true,
        teacherId: true,
        amount: true,
        note: true,
        paidAt: true,
      },
      orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
    });

    const advanceLineRows = [];
    for (const advance of advances) {
      const teacherId = advance.teacherId || null;
      let item = itemByEmployeeCache.get(advance.employeeId) || (teacherId ? itemByTeacherCache.get(teacherId) : null);
      if (!item) {
        item = await getOrCreatePayrollItem(tx, {
          organizationId: org.id,
          payrollRunId: run.id,
          employeeId: advance.employeeId,
          teacherId,
        });
        setItemCache(item);
      } else if ((!item.employeeId || item.employeeId !== advance.employeeId) || (teacherId && item.teacherId !== teacherId)) {
        const patch = {};
        if (!item.employeeId || item.employeeId !== advance.employeeId) patch.employeeId = advance.employeeId;
        if (teacherId && item.teacherId !== teacherId) patch.teacherId = teacherId;
        item = await tx.payrollItem.update({
          where: { id: item.id },
          data: patch,
          select: { id: true, teacherId: true, employeeId: true },
        });
        setItemCache(item);
      }

      advanceLineRows.push({
        organizationId: org.id,
        payrollRunId: run.id,
        payrollItemId: item.id,
        employeeId: advance.employeeId,
        teacherId,
        type: "ADVANCE_DEDUCTION",
        advancePaymentId: advance.id,
        amount: money(advance.amount).neg(),
        description: cleanOptional(advance.note) || "Avans ushlanmasi",
        createdByUserId: actorUserId || null,
        meta: {
          source: "ADVANCE_PAYMENT",
          advancePaymentId: advance.id,
          periodMonth,
          paidAt: advance.paidAt,
        },
      });
    }
    if (advanceLineRows.length) {
      await tx.payrollLine.createMany({ data: advanceLineRows });
    }

    await recalculatePayrollRunAggregates(tx, {
      payrollRunId: run.id,
    });

    const beforeGeneratedAt = run.generatedAt;
    const now = new Date();
    const lessonLinesCreated = lessonLineRows.length;
    await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        generatedAt: now,
        generationSummary: {
          periodMonth,
          lessonCount: lessonLinesCreated,
          fixedSalaryCount: fixedSalaryEmployees.length,
          advanceCount: advances.length,
          generatedAt: now.toISOString(),
        },
        ...(beforeGeneratedAt ? { calcVersion: { increment: 1 } } : {}),
      },
    });

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId,
      action: "PAYROLL_RUN_GENERATE",
      entityType: "PAYROLL_RUN",
      entityId: run.id,
      payrollRunId: run.id,
      before: { status: run.status, generatedAt: beforeGeneratedAt || null },
      after: { status: "DRAFT", lessonCount: lessonLinesCreated },
      req,
    });

    const freshRun = await tx.payrollRun.findUnique({
      where: { id: run.id },
      include: {
        items: {
          orderBy: [{ payableAmount: "desc" }, { teacherLastNameSnapshot: "asc" }],
          include: {
            employee: {
              select: {
                id: true,
                kind: true,
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
          },
        },
      },
    });

    return {
      run: freshRun,
      generation: { lessonsProcessed: lessonLinesCreated },
    };
  });
}

module.exports = {
  executeGeneratePayrollRun,
};
