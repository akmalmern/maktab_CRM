const HAFTA_KUNI_TO_WEEKDAY = Object.freeze({
  DUSHANBA: 1,
  SESHANBA: 2,
  CHORSHANBA: 3,
  PAYSHANBA: 4,
  JUMA: 5,
  SHANBA: 6,
});

function parseTimeToMinutes(value) {
  const [hoursRaw, minutesRaw] = String(value || "").split(":");
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return (hours * 60) + minutes;
}

function getSlotDurationMinutes(vaqtOraliq) {
  const start = parseTimeToMinutes(vaqtOraliq?.boshlanishVaqti);
  const end = parseTimeToMinutes(vaqtOraliq?.tugashVaqti);
  if (start == null || end == null || end <= start) return null;
  return end - start;
}

function getAcademicYearFromPeriodMonth(periodMonth, ApiError) {
  const [yearRaw, monthRaw] = String(periodMonth || "").split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new ApiError(400, "INVALID_PERIOD_MONTH", "periodMonth formati YYYY-MM bo'lishi kerak");
  }
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function weekdayOccurrencesForPeriodMonth(periodMonth, ApiError) {
  const [yearRaw, monthRaw] = String(periodMonth || "").split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new ApiError(400, "INVALID_PERIOD_MONTH", "periodMonth formati YYYY-MM bo'lishi kerak");
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    counts[weekday] += 1;
  }
  return counts;
}

function teacherDisplayLabel(teacher) {
  if (!teacher) return null;
  const full = `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim();
  const username = teacher.user?.username ? `@${teacher.user.username}` : "";
  if (full && username) return `${full} (${username})`;
  return full || username || teacher.id || null;
}

function minutesToRoundedHours(minutes) {
  const value = Number(minutes || 0) / 60;
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

function incrementMapNumber(map, key, delta) {
  if (!key) return;
  const prev = Number(map.get(key) || 0);
  map.set(key, prev + Number(delta || 0));
}

function buildTeacherDirectoryRows(rows) {
  return new Map(
    (rows || []).map((row) => [
      row.id,
      {
        id: row.id,
        firstName: row.firstName || null,
        lastName: row.lastName || null,
        user: row.user ? { username: row.user.username } : null,
        employeeId: row.employeeId || null,
      },
    ]),
  );
}

function decimalToNumber(value) {
  if (value == null) return 0;
  const textValue =
    typeof value === "object" && value !== null && typeof value.toString === "function"
      ? value.toString()
      : value;
  const parsed = Number(textValue);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function executeCollectPayrollPeriodDiagnosticsTx({
  deps,
  tx,
  organizationId,
  periodMonth,
  periodStart,
  periodEnd,
  includeDetails = false,
}) {
  const {
    ApiError,
    DECIMAL_ZERO,
    decimal,
    loadRatesForPeriod,
    isEmployeeLessonPayrollEligible,
    resolvePayrollTeacherIdForLesson,
    resolveRateForLesson,
  } = deps;

  const oquvYili = getAcademicYearFromPeriodMonth(periodMonth, ApiError);
  const weekdayOccurrences = weekdayOccurrencesForPeriodMonth(periodMonth, ApiError);

  const [lessons, teacherEmployees, activeTeachers, scheduleRows, workloadPlans, periodRuns] = await Promise.all([
    tx.realLesson.findMany({
      where: {
        organizationId,
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
    }),
    tx.employee.findMany({
      where: {
        organizationId,
        kind: "TEACHER",
      },
      select: {
        id: true,
        payrollMode: true,
        employmentStatus: true,
        isPayrollEligible: true,
        fixedSalaryAmount: true,
        teacher: { select: { id: true, firstName: true, lastName: true, user: { select: { username: true } } } },
        user: { select: { username: true, isActive: true } },
      },
    }),
    tx.teacher.findMany({
      where: {
        user: { is: { isActive: true } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        user: { select: { username: true } },
      },
    }),
    tx.darsJadvali.findMany({
      where: {
        oquvYili,
        sinf: { isArchived: false },
      },
      select: {
        id: true,
        oqituvchiId: true,
        haftaKuni: true,
        vaqtOraliq: { select: { boshlanishVaqti: true, tugashVaqti: true } },
      },
    }),
    tx.teacherWorkloadPlan.findMany({
      where: { oquvYili },
      select: { id: true, teacherId: true, weeklyMinutesLimit: true, note: true },
    }),
    tx.payrollRun.findMany({
      where: {
        organizationId,
        periodMonth,
      },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        status: true,
        createdAt: true,
        generatedAt: true,
        approvedAt: true,
        paidAt: true,
        payableAmount: true,
        grossAmount: true,
        adjustmentAmount: true,
      },
    }),
  ]);

  const plannedWeeklyMinutesByTeacher = new Map();
  const plannedMonthlyMinutesByTeacher = new Map();
  const invalidScheduleRows = [];
  for (const row of scheduleRows) {
    const duration = getSlotDurationMinutes(row.vaqtOraliq);
    const weekday = HAFTA_KUNI_TO_WEEKDAY[row.haftaKuni];
    if (!duration || weekday === undefined) {
      invalidScheduleRows.push({
        darsJadvaliId: row.id,
        teacherId: row.oqituvchiId,
        haftaKuni: row.haftaKuni,
      });
      continue;
    }
    incrementMapNumber(plannedWeeklyMinutesByTeacher, row.oqituvchiId, duration);
    incrementMapNumber(
      plannedMonthlyMinutesByTeacher,
      row.oqituvchiId,
      duration * Number(weekdayOccurrences[weekday] || 0),
    );
  }

  const { teacherMap, subjectMap } = await loadRatesForPeriod(tx, {
    organizationId,
    lessons,
    periodStart,
    periodEnd,
  });
  const lessonEligibilityByTeacherId = new Map(
    teacherEmployees
      .filter((row) => row.teacher?.id)
      .map((row) => [row.teacher.id, isEmployeeLessonPayrollEligible(row)]),
  );

  const actualMinutesByTeacher = new Map();
  const lessonCountByTeacher = new Map();
  const missingRateLessons = [];
  const invalidReplacedLessons = [];
  for (const lesson of lessons) {
    let payrollTeacherId = null;
    try {
      payrollTeacherId = resolvePayrollTeacherIdForLesson(lesson);
    } catch (error) {
      if (error instanceof ApiError && error.code === "REAL_LESSON_REPLACED_TEACHER_REQUIRED") {
        invalidReplacedLessons.push({
          realLessonId: lesson.id,
          teacherId: lesson.teacherId,
          replacedByTeacherId: lesson.replacedByTeacherId || null,
          status: lesson.status,
          subjectId: lesson.subjectId,
          startAt: lesson.startAt,
        });
        continue;
      }
      throw error;
    }

    if (lessonEligibilityByTeacherId.get(payrollTeacherId) === false) {
      continue;
    }

    incrementMapNumber(actualMinutesByTeacher, payrollTeacherId, Number(lesson.durationMinutes || 0));
    incrementMapNumber(lessonCountByTeacher, payrollTeacherId, 1);

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
        replacedByTeacherId: lesson.replacedByTeacherId || null,
        subjectId: lesson.subjectId,
        classroomId: lesson.classroomId,
        status: lesson.status,
        startAt: lesson.startAt,
      });
    }
  }

  const planByTeacher = new Map(workloadPlans.map((plan) => [plan.teacherId, plan]));
  const missingWorkloadPlanTeachers = [];
  const overloadedTeachers = [];
  for (const [teacherId, weeklyMinutes] of plannedWeeklyMinutesByTeacher.entries()) {
    const plan = planByTeacher.get(teacherId);
    if (!plan) {
      missingWorkloadPlanTeachers.push({ teacherId, plannedWeeklyMinutes: weeklyMinutes });
      continue;
    }
    if (Number(weeklyMinutes) > Number(plan.weeklyMinutesLimit || 0)) {
      overloadedTeachers.push({
        teacherId,
        plannedWeeklyMinutes: weeklyMinutes,
        limitWeeklyMinutes: Number(plan.weeklyMinutesLimit || 0),
      });
    }
  }

  const invalidFixedSalaryEmployees = [];
  for (const employee of teacherEmployees) {
    if (!employee.isPayrollEligible) continue;
    if (employee.employmentStatus !== "ACTIVE") continue;
    if (!["FIXED", "MIXED"].includes(employee.payrollMode)) continue;
    const fixedSalary = decimal(employee.fixedSalaryAmount);
    if (fixedSalary.lte(DECIMAL_ZERO)) {
      invalidFixedSalaryEmployees.push({
        employeeId: employee.id,
        teacherId: employee.teacher?.id || null,
        payrollMode: employee.payrollMode,
        fixedSalaryAmount: employee.fixedSalaryAmount,
      });
    }
  }

  const activeRuns = periodRuns.filter((run) => ["DRAFT", "APPROVED", "PAID"].includes(run.status));
  const activeRunConflict = activeRuns.length > 1;
  const activeRun = activeRuns[0] || null;
  const lockedRun = activeRun && activeRun.status !== "DRAFT" ? activeRun : null;

  const teacherIdsInScope = new Set();
  for (const row of activeTeachers) teacherIdsInScope.add(row.id);
  for (const key of plannedWeeklyMinutesByTeacher.keys()) teacherIdsInScope.add(key);
  for (const key of plannedMonthlyMinutesByTeacher.keys()) teacherIdsInScope.add(key);
  for (const key of actualMinutesByTeacher.keys()) teacherIdsInScope.add(key);
  for (const key of lessonCountByTeacher.keys()) teacherIdsInScope.add(key);
  for (const row of missingRateLessons) teacherIdsInScope.add(row.teacherId);
  for (const row of missingWorkloadPlanTeachers) teacherIdsInScope.add(row.teacherId);
  for (const row of overloadedTeachers) teacherIdsInScope.add(row.teacherId);
  for (const row of invalidFixedSalaryEmployees) {
    if (row.teacherId) teacherIdsInScope.add(row.teacherId);
  }

  let teacherDirectory = buildTeacherDirectoryRows(activeTeachers);
  const missingDirectoryTeacherIds = [...teacherIdsInScope].filter(
    (teacherId) => teacherId && !teacherDirectory.has(teacherId),
  );
  if (missingDirectoryTeacherIds.length) {
    const extraTeachers = await tx.teacher.findMany({
      where: { id: { in: missingDirectoryTeacherIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        user: { select: { username: true } },
      },
    });
    teacherDirectory = new Map([...teacherDirectory, ...buildTeacherDirectoryRows(extraTeachers)]);
  }

  const teacherMetrics = [...teacherIdsInScope]
    .filter(Boolean)
    .map((teacherId) => {
      const teacher = teacherDirectory.get(teacherId) || { id: teacherId };
      const plannedWeeklyMinutes = Number(plannedWeeklyMinutesByTeacher.get(teacherId) || 0);
      const plannedMonthlyMinutes = Number(plannedMonthlyMinutesByTeacher.get(teacherId) || 0);
      const actualMonthlyMinutes = Number(actualMinutesByTeacher.get(teacherId) || 0);
      const lessonCount = Number(lessonCountByTeacher.get(teacherId) || 0);
      const plan = planByTeacher.get(teacherId) || null;
      return {
        teacherId,
        teacherName: teacherDisplayLabel(teacher) || teacherId,
        username: teacher.user?.username || null,
        plannedWeeklyMinutes,
        plannedWeeklyHours: minutesToRoundedHours(plannedWeeklyMinutes),
        plannedMonthlyMinutes,
        plannedMonthlyHours: minutesToRoundedHours(plannedMonthlyMinutes),
        actualMonthlyMinutes,
        actualMonthlyHours: minutesToRoundedHours(actualMonthlyMinutes),
        monthlyDeltaMinutes: actualMonthlyMinutes - plannedMonthlyMinutes,
        monthlyDeltaHours: minutesToRoundedHours(actualMonthlyMinutes - plannedMonthlyMinutes),
        lessonCount,
        weeklyPlanMinutes: plan ? Number(plan.weeklyMinutesLimit || 0) : null,
        weeklyPlanHours: plan ? minutesToRoundedHours(plan.weeklyMinutesLimit) : null,
        hasWorkloadPlan: Boolean(plan),
      };
    })
    .sort((a, b) => {
      const byActual = b.actualMonthlyMinutes - a.actualMonthlyMinutes;
      if (byActual !== 0) return byActual;
      return String(a.teacherName || "").localeCompare(String(b.teacherName || ""));
    });

  const teacherSnapshot = (teacherId) => {
    const teacher = teacherDirectory.get(teacherId) || { id: teacherId };
    return {
      teacherId,
      teacherName: teacherDisplayLabel(teacher) || teacherId || "-",
      username: teacher.user?.username || null,
    };
  };

  const blockers = [];
  const warnings = [];

  if (activeRunConflict) {
    blockers.push({
      code: "PAYROLL_RUN_PERIOD_CONFLICT",
      message: "Bir oy uchun bir nechta aktiv payroll run topildi",
      count: activeRuns.length,
      sample: activeRuns.slice(0, 20).map((run) => ({ runId: run.id, status: run.status })),
    });
  }
  if (invalidReplacedLessons.length) {
    blockers.push({
      code: "REAL_LESSON_REPLACED_TEACHER_REQUIRED",
      message: "REPLACED statusdagi ayrim real lessonlarda replacement teacher kiritilmagan",
      count: invalidReplacedLessons.length,
      sample: invalidReplacedLessons.slice(0, 20).map((row) => ({
        ...teacherSnapshot(row.teacherId),
        realLessonId: row.realLessonId,
        status: row.status,
        startAt: row.startAt,
      })),
    });
  }
  if (missingRateLessons.length) {
    blockers.push({
      code: "PAYROLL_RATE_NOT_FOUND",
      message: "Ba'zi darslar uchun rate topilmadi",
      count: missingRateLessons.length,
      sample: missingRateLessons.slice(0, 30).map((row) => ({
        ...teacherSnapshot(row.teacherId),
        realLessonId: row.realLessonId,
        subjectId: row.subjectId,
        status: row.status,
        startAt: row.startAt,
      })),
    });
  }
  if (invalidFixedSalaryEmployees.length) {
    blockers.push({
      code: "PAYROLL_FIXED_SALARY_REQUIRED",
      message: "FIXED/MIXED rejimdagi ayrim xodimlarda oklad summasi 0 yoki bo'sh",
      count: invalidFixedSalaryEmployees.length,
      sample: invalidFixedSalaryEmployees.slice(0, 20).map((row) => ({
        ...teacherSnapshot(row.teacherId),
        employeeId: row.employeeId,
        payrollMode: row.payrollMode,
      })),
    });
  }

  if (lockedRun) {
    warnings.push({
      code: "PAYROLL_RUN_LOCKED",
      message: `Bu oy uchun run ${lockedRun.status} holatida. Generate/advance sync cheklangan`,
      count: 1,
      sample: [{ runId: lockedRun.id, status: lockedRun.status }],
    });
  }
  if (missingWorkloadPlanTeachers.length) {
    warnings.push({
      code: "TEACHER_WEEKLY_PLAN_REQUIRED",
      message: "Ba'zi o'qituvchilar uchun haftalik yuklama plani yo'q",
      count: missingWorkloadPlanTeachers.length,
      sample: missingWorkloadPlanTeachers.slice(0, 20).map((row) => ({
        ...teacherSnapshot(row.teacherId),
        plannedWeeklyMinutes: row.plannedWeeklyMinutes,
      })),
    });
  }
  if (overloadedTeachers.length) {
    warnings.push({
      code: "TEACHER_WEEKLY_HOURS_EXCEEDED",
      message: "Ba'zi o'qituvchilarda haftalik jadval yuklama limitidan oshgan",
      count: overloadedTeachers.length,
      sample: overloadedTeachers.slice(0, 20).map((row) => ({
        ...teacherSnapshot(row.teacherId),
        plannedWeeklyMinutes: row.plannedWeeklyMinutes,
        limitWeeklyMinutes: row.limitWeeklyMinutes,
      })),
    });
  }
  if (invalidScheduleRows.length) {
    warnings.push({
      code: "SCHEDULE_SLOT_INVALID",
      message: "Ayrim jadval qatorlarida vaqt oralig'i noto'g'ri",
      count: invalidScheduleRows.length,
      sample: invalidScheduleRows.slice(0, 20).map((row) => ({
        darsJadvaliId: row.darsJadvaliId,
        teacherId: row.teacherId,
        haftaKuni: row.haftaKuni,
      })),
    });
  }

  const blockingCodes = new Set(blockers.map((row) => row.code));
  const readyForGenerate = blockers.length === 0 && !lockedRun;
  const readyForAutoProcess = blockers.length === 0 && !activeRunConflict;

  const response = {
    periodMonth,
    oquvYili,
    summary: {
      blockerCount: blockers.length,
      warningCount: warnings.length,
      readyForGenerate,
      readyForAutoProcess,
      blockingCodes: [...blockingCodes],
    },
    metrics: {
      activeTeacherCount: activeTeachers.length,
      realLessonCount: lessons.length,
      scheduleRowCount: scheduleRows.length,
      missingRateLessonCount: missingRateLessons.length,
      invalidReplacedLessonCount: invalidReplacedLessons.length,
      invalidFixedSalaryConfigCount: invalidFixedSalaryEmployees.length,
      missingWorkloadPlanCount: missingWorkloadPlanTeachers.length,
      overloadedTeacherCount: overloadedTeachers.length,
      invalidScheduleSlotCount: invalidScheduleRows.length,
      activeRunCount: activeRuns.length,
    },
    currentRun: activeRun
      ? {
          id: activeRun.id,
          status: activeRun.status,
          createdAt: activeRun.createdAt,
          generatedAt: activeRun.generatedAt,
          approvedAt: activeRun.approvedAt,
          paidAt: activeRun.paidAt,
          grossAmount: activeRun.grossAmount,
          adjustmentAmount: activeRun.adjustmentAmount,
          payableAmount: activeRun.payableAmount,
        }
      : null,
    blockers,
    warnings,
    teacherMetrics,
  };

  if (!includeDetails) {
    for (const issue of [...response.blockers, ...response.warnings]) {
      if (issue.sample && issue.sample.length > 5) {
        issue.sample = issue.sample.slice(0, 5);
      }
    }
    if (response.teacherMetrics.length > 50) {
      response.teacherMetrics = response.teacherMetrics.slice(0, 50);
    }
  }

  return response;
}

async function executeGetPayrollAutomationHealth({ deps, periodMonth, includeDetails = false }) {
  const { prisma, ensureMainOrganization, monthKeyToUtcRange } = deps;
  const { periodStart, periodEnd } = monthKeyToUtcRange(periodMonth);

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    return executeCollectPayrollPeriodDiagnosticsTx({
      deps,
      tx,
      organizationId: org.id,
      periodMonth,
      periodStart,
      periodEnd,
      includeDetails,
    });
  });
}

async function executeGetPayrollMonthlyReport({ deps, periodMonth, includeDetails = false }) {
  const {
    prisma,
    DECIMAL_ZERO,
    money,
    decimal,
    ensureMainOrganization,
    monthKeyToUtcRange,
    getActiveRunForPeriod,
  } = deps;
  const { periodStart, periodEnd } = monthKeyToUtcRange(periodMonth);

  return prisma.$transaction(async (tx) => {
    const org = await ensureMainOrganization(tx);
    const health = await executeCollectPayrollPeriodDiagnosticsTx({
      deps,
      tx,
      organizationId: org.id,
      periodMonth,
      periodStart,
      periodEnd,
      includeDetails,
    });

    const run = await getActiveRunForPeriod(tx, { organizationId: org.id, periodMonth });
    if (!run) {
      return {
        periodMonth,
        run: null,
        summary: {
          grossAmount: money(0),
          adjustmentAmount: money(0),
          payableAmount: money(0),
          paidAmount: money(0),
          remainingAmount: money(0),
          paymentCount: 0,
          paidTeacherCount: 0,
        },
        payoutBreakdown: [],
        paymentMethodBreakdown: [],
        lineTypeBreakdown: [],
        health,
      };
    }

    const [runItems, payments, lines] = await Promise.all([
      tx.payrollItem.findMany({
        where: { payrollRunId: run.id, organizationId: org.id },
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
      }),
      tx.payrollItemPayment.findMany({
        where: { payrollRunId: run.id, organizationId: org.id },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          paidAt: true,
          payrollItemId: true,
        },
      }),
      tx.payrollLine.findMany({
        where: { payrollRunId: run.id, organizationId: org.id },
        select: { id: true, type: true, amount: true },
      }),
    ]);

    const teacherMetricByTeacherId = new Map((health.teacherMetrics || []).map((row) => [row.teacherId, row]));

    const payoutBreakdown = runItems.map((item) => {
      const teacherName =
        (item.employee && `${item.employee.firstName || ""} ${item.employee.lastName || ""}`.trim()) ||
        (item.teacher && `${item.teacher.firstName || ""} ${item.teacher.lastName || ""}`.trim()) ||
        `${item.teacherFirstNameSnapshot || ""} ${item.teacherLastNameSnapshot || ""}`.trim() ||
        item.teacherId ||
        item.employeeId ||
        "-";
      const username =
        item.employee?.user?.username || item.teacher?.user?.username || item.teacherUsernameSnapshot || null;
      const teacherMetric = item.teacherId ? teacherMetricByTeacherId.get(item.teacherId) : null;
      const paidAmount = money(item.paidAmount);
      const payableAmount = money(item.payableAmount);
      return {
        payrollItemId: item.id,
        teacherId: item.teacherId || null,
        employeeId: item.employeeId || null,
        ownerName: username ? `${teacherName} (@${username})` : teacherName,
        paymentStatus: item.paymentStatus,
        totalMinutes: Number(item.totalMinutes || 0),
        totalHours: decimalToNumber(item.totalHours),
        grossAmount: item.grossAmount,
        adjustmentAmount: item.adjustmentAmount,
        payableAmount,
        paidAmount,
        remainingAmount: money(payableAmount.minus(paidAmount)),
        plannedMonthlyMinutes: teacherMetric?.plannedMonthlyMinutes || 0,
        actualMonthlyMinutes: teacherMetric?.actualMonthlyMinutes || 0,
        monthlyDeltaMinutes: teacherMetric?.monthlyDeltaMinutes || 0,
      };
    });

    const methodTotals = new Map();
    for (const payment of payments) {
      const prev = methodTotals.get(payment.paymentMethod) || DECIMAL_ZERO;
      methodTotals.set(payment.paymentMethod, money(prev.plus(payment.amount)));
    }
    const paymentMethodBreakdown = [...methodTotals.entries()]
      .map(([paymentMethod, amount]) => ({ paymentMethod, amount }))
      .sort((a, b) => decimalToNumber(b.amount) - decimalToNumber(a.amount));

    const lineTypeTotals = new Map();
    for (const line of lines) {
      const prev = lineTypeTotals.get(line.type) || DECIMAL_ZERO;
      lineTypeTotals.set(line.type, money(prev.plus(line.amount)));
    }
    const lineTypeBreakdown = [...lineTypeTotals.entries()]
      .map(([type, amount]) => ({ type, amount }))
      .sort((a, b) => decimalToNumber(b.amount) - decimalToNumber(a.amount));

    const totalPaidAmount = payments.reduce((sum, row) => sum.plus(decimal(row.amount)), DECIMAL_ZERO);
    const paidTeacherCount = runItems.filter((item) => item.paymentStatus === "PAID").length;
    const remainingAmount = money(decimal(run.payableAmount).minus(totalPaidAmount));

    return {
      periodMonth,
      run,
      summary: {
        grossAmount: run.grossAmount,
        adjustmentAmount: run.adjustmentAmount,
        payableAmount: run.payableAmount,
        paidAmount: money(totalPaidAmount),
        remainingAmount,
        paymentCount: payments.length,
        paidTeacherCount,
      },
      payoutBreakdown,
      paymentMethodBreakdown,
      lineTypeBreakdown,
      health,
    };
  });
}

module.exports = {
  executeCollectPayrollPeriodDiagnosticsTx,
  executeGetPayrollAutomationHealth,
  executeGetPayrollMonthlyReport,
};
