function periodMonthFromLessonStart(startAt, { ApiError, utcDateToTashkentIsoDate }) {
  const localDate = utcDateToTashkentIsoDate(startAt);
  const periodMonth = String(localDate || "").slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodMonth)) {
    throw new ApiError(400, "INVALID_PERIOD_MONTH", "RealLesson sanasidan periodMonth ajratib bo'lmadi");
  }
  return periodMonth;
}

async function executeRefreshDraftPayrollForLesson({ deps, lessonId, actorUserId, req }) {
  const {
    prisma,
    ApiError,
    utcDateToTashkentIsoDate,
    ensureMainOrganization,
    monthKeyToUtcRange,
    lockPayrollPeriodScope,
    getActiveRunForPeriod,
    resolvePayrollTeacherIdForLesson,
    ensureEmployeeForTeacher,
    isEmployeeLessonPayrollEligible,
    loadRatesForPeriod,
    resolveRateForLesson,
    getOrCreatePayrollItem,
    calcLessonAmount,
    recalculatePayrollRunAggregates,
    createAuditLog,
  } = deps;

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const lesson = await tx.realLesson.findFirst({
      where: { id: lessonId, organizationId: org.id },
      select: {
        id: true,
        teacherId: true,
        status: true,
        replacedByTeacherId: true,
        subjectId: true,
        classroomId: true,
        startAt: true,
        durationMinutes: true,
        teacher: { select: { userId: true } },
      },
    });
    if (!lesson) throw new ApiError(404, "REAL_LESSON_NOT_FOUND", "Real lesson topilmadi");

    const periodMonth = periodMonthFromLessonStart(lesson.startAt, {
      ApiError,
      utcDateToTashkentIsoDate,
    });
    const { periodStart, periodEnd } = monthKeyToUtcRange(periodMonth);
    const lessonEligible = lesson.status === "DONE" || lesson.status === "REPLACED";

    await lockPayrollPeriodScope(tx, { organizationId: org.id, periodMonth });

    let run = await getActiveRunForPeriod(tx, { organizationId: org.id, periodMonth });
    if (run && run.status !== "DRAFT") {
      throw new ApiError(409, "PAYROLL_RUN_LOCKED", `Bu oy uchun payroll run ${run.status} holatida`);
    }

    if (!run && !lessonEligible) {
      return {
        runId: null,
        periodMonth,
        lessonId: lesson.id,
        refreshed: false,
        skipped: true,
        reason: "LESSON_NOT_PAYROLL_ELIGIBLE",
      };
    }

    if (!run) {
      const createdByUserId = actorUserId || lesson.teacher?.userId || null;
      if (!createdByUserId) {
        throw new ApiError(
          400,
          "PAYROLL_RUN_ACTOR_REQUIRED",
          "Payroll run yaratish uchun actorUserId topilmadi",
        );
      }
      run = await tx.payrollRun.create({
        data: {
          organizationId: org.id,
          periodMonth,
          periodStart,
          periodEnd,
          timezone: "Asia/Tashkent",
          status: "DRAFT",
          createdByUserId,
        },
      });
      await createAuditLog(tx, {
        organizationId: org.id,
        actorUserId: createdByUserId,
        action: "PAYROLL_RUN_CREATE",
        entityType: "PAYROLL_RUN",
        entityId: run.id,
        payrollRunId: run.id,
        after: { periodMonth, periodStart, periodEnd, status: "DRAFT" },
        req,
      });
    }

    const existingLine = await tx.payrollLine.findFirst({
      where: { payrollRunId: run.id, realLessonId: lesson.id },
      select: { id: true, payrollItemId: true },
    });

    let linePayload = null;
    if (lessonEligible) {
      const payrollTeacherId = resolvePayrollTeacherIdForLesson(lesson);
      const owner = await ensureEmployeeForTeacher(tx, {
        teacherId: payrollTeacherId,
        organizationId: org.id,
      });

      if (isEmployeeLessonPayrollEligible(owner.employee)) {
        const { teacherMap, subjectMap } = await loadRatesForPeriod(tx, {
          organizationId: org.id,
          lessons: [lesson],
          periodStart,
          periodEnd,
        });
        const resolved = resolveRateForLesson({
          lesson: { ...lesson, teacherId: payrollTeacherId },
          teacherRateMap: teacherMap,
          subjectDefaultRateMap: subjectMap,
        });
        if (!resolved) {
          throw new ApiError(
            409,
            "PAYROLL_RATE_NOT_FOUND",
            "Dars uchun rate topilmadi. Avval rate kiriting",
            {
              totalMissing: 1,
              missingRateLessons: [
                {
                  realLessonId: lesson.id,
                  teacherId: payrollTeacherId,
                  sourceTeacherId: lesson.teacherId,
                  status: lesson.status,
                  replacedByTeacherId: lesson.replacedByTeacherId || null,
                  subjectId: lesson.subjectId,
                  classroomId: lesson.classroomId,
                  startAt: lesson.startAt,
                },
              ],
            },
          );
        }
        const item = await getOrCreatePayrollItem(tx, {
          organizationId: org.id,
          payrollRunId: run.id,
          teacherId: payrollTeacherId,
          employeeId: owner.employee.id,
        });
        const amount = calcLessonAmount(resolved.ratePerHour, lesson.durationMinutes);
        linePayload = {
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
        };
      }
    }

    if (existingLine) {
      await tx.payrollLine.delete({
        where: { id: existingLine.id },
      });
    }
    if (linePayload) {
      await tx.payrollLine.create({ data: linePayload });
    }

    const affectedItemIds = new Set();
    if (existingLine?.payrollItemId) affectedItemIds.add(existingLine.payrollItemId);
    if (linePayload?.payrollItemId) affectedItemIds.add(linePayload.payrollItemId);
    if (affectedItemIds.size) {
      for (const itemId of affectedItemIds) {
        await recalculatePayrollRunAggregates(tx, {
          payrollRunId: run.id,
          payrollItemId: itemId,
        });
      }
    } else {
      await recalculatePayrollRunAggregates(tx, { payrollRunId: run.id });
    }

    const beforeGeneratedAt = run.generatedAt;
    const now = new Date();
    await tx.payrollRun.update({
      where: { id: run.id },
      data: {
        generatedAt: now,
        generationSummary: {
          mode: "INCREMENTAL_LESSON_REFRESH",
          periodMonth,
          lessonId: lesson.id,
          refreshedAt: now.toISOString(),
        },
        ...(beforeGeneratedAt ? { calcVersion: { increment: 1 } } : {}),
      },
    });

    await createAuditLog(tx, {
      organizationId: org.id,
      actorUserId: actorUserId || null,
      action: "PAYROLL_RUN_REFRESH_LESSON",
      entityType: "PAYROLL_RUN",
      entityId: run.id,
      payrollRunId: run.id,
      before: {
        generatedAt: beforeGeneratedAt || null,
        hadExistingLine: Boolean(existingLine),
      },
      after: {
        generatedAt: now,
        lessonId: lesson.id,
        lessonStatus: lesson.status,
        lineUpserted: Boolean(linePayload),
      },
      req,
    });

    return {
      runId: run.id,
      periodMonth,
      lessonId: lesson.id,
      refreshed: true,
      skipped: false,
      reason: null,
    };
  });
}

module.exports = {
  executeRefreshDraftPayrollForLesson,
};
