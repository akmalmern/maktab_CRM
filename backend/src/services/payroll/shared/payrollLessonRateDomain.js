const LESSON_PAYROLL_MODES = new Set(["LESSON_BASED", "MIXED"]);

function createPayrollLessonRateDomain({ ApiError, decimal, money }) {
  function isEmployeeLessonPayrollEligible(employee) {
    if (!employee) return false;
    if (!employee.isPayrollEligible) return false;
    if (employee.employmentStatus !== "ACTIVE") return false;
    return LESSON_PAYROLL_MODES.has(employee.payrollMode);
  }

  function rateMatchesAt(rate, at) {
    const atTime = new Date(at).getTime();
    const fromOk = new Date(rate.effectiveFrom).getTime() <= atTime;
    const toOk = !rate.effectiveTo || new Date(rate.effectiveTo).getTime() > atTime;
    return fromOk && toOk;
  }

  async function loadRatesForPeriod(tx, { organizationId, lessons, periodStart, periodEnd }) {
    // REPLACED darslarda hisob replacement teacher orqali yuradi, shuning uchun ikkalasini preload qilamiz.
    const teacherIds = [
      ...new Set(
        lessons
          .flatMap((lesson) => [lesson.teacherId, lesson.replacedByTeacherId])
          .filter(Boolean),
      ),
    ];
    const subjectIds = [...new Set(lessons.map((lesson) => lesson.subjectId))];
    const commonOverlap = {
      organizationId,
      effectiveFrom: { lt: periodEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: periodStart } }],
    };

    const [teacherRates, subjectDefaultRates] = await Promise.all([
      teacherIds.length && subjectIds.length
        ? tx.teacherRate.findMany({
            where: {
              ...commonOverlap,
              teacherId: { in: teacherIds },
              subjectId: { in: subjectIds },
            },
            orderBy: [{ teacherId: "asc" }, { subjectId: "asc" }, { effectiveFrom: "desc" }],
          })
        : Promise.resolve([]),
      subjectIds.length
        ? tx.subjectDefaultRate.findMany({
            where: {
              ...commonOverlap,
              subjectId: { in: subjectIds },
            },
            orderBy: [{ subjectId: "asc" }, { effectiveFrom: "desc" }],
          })
        : Promise.resolve([]),
    ]);

    const teacherMap = new Map();
    for (const row of teacherRates) {
      const key = `${row.teacherId}:${row.subjectId}`;
      if (!teacherMap.has(key)) teacherMap.set(key, []);
      teacherMap.get(key).push(row);
    }

    const subjectMap = new Map();
    for (const row of subjectDefaultRates) {
      if (!subjectMap.has(row.subjectId)) subjectMap.set(row.subjectId, []);
      subjectMap.get(row.subjectId).push(row);
    }

    return { teacherMap, subjectMap };
  }

  function resolveRateForLesson({ lesson, teacherRateMap, subjectDefaultRateMap }) {
    const teacherRates = teacherRateMap.get(`${lesson.teacherId}:${lesson.subjectId}`) || [];
    const teacherRate = teacherRates.find((rate) => rateMatchesAt(rate, lesson.startAt));
    if (teacherRate) {
      return {
        rateSource: "TEACHER_RATE",
        ratePerHour: teacherRate.ratePerHour,
        teacherRateId: teacherRate.id,
        subjectDefaultRateId: null,
      };
    }

    const subjectRates = subjectDefaultRateMap.get(lesson.subjectId) || [];
    const subjectRate = subjectRates.find((rate) => rateMatchesAt(rate, lesson.startAt));
    if (subjectRate) {
      return {
        rateSource: "SUBJECT_DEFAULT_RATE",
        ratePerHour: subjectRate.ratePerHour,
        teacherRateId: null,
        subjectDefaultRateId: subjectRate.id,
      };
    }

    return null;
  }

  function calcLessonAmount(ratePerHour, minutes) {
    return money(decimal(ratePerHour).mul(decimal(minutes)).div(60));
  }

  function resolvePayrollTeacherIdForLesson(lesson) {
    if (lesson.status === "REPLACED") {
      if (!lesson.replacedByTeacherId) {
        throw new ApiError(
          409,
          "REAL_LESSON_REPLACED_TEACHER_REQUIRED",
          "REPLACED statusdagi darsda replacedByTeacherId bo'lishi kerak",
          { realLessonId: lesson.id },
        );
      }
      return lesson.replacedByTeacherId;
    }

    return lesson.teacherId;
  }

  return {
    isEmployeeLessonPayrollEligible,
    loadRatesForPeriod,
    resolveRateForLesson,
    calcLessonAmount,
    resolvePayrollTeacherIdForLesson,
  };
}

module.exports = {
  createPayrollLessonRateDomain,
};
