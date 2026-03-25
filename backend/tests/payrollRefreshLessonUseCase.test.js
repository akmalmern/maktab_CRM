const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiError } = require("../src/utils/apiError");
const {
  executeRefreshDraftPayrollForLesson,
} = require("../src/services/payroll/useCases/refreshDraftPayrollForLesson");

function decimalLike(value) {
  const numericValue =
    typeof value === "object" && value !== null ? Number(value.value ?? value.toString?.()) : Number(value);
  return {
    value: numericValue,
    toString() {
      return String(this.value);
    },
  };
}

test("executeRefreshDraftPayrollForLesson skips when lesson is not payroll eligible and no draft run exists", async () => {
  const deps = {
    prisma: {
      $transaction: async (callback) =>
        callback({
          realLesson: {
            findFirst: async () => ({
              id: "lesson_1",
              teacherId: "teacher_1",
              status: "ABSENT",
              replacedByTeacherId: null,
              subjectId: "subject_1",
              classroomId: "class_1",
              startAt: "2026-03-15T08:00:00.000Z",
              durationMinutes: 60,
              teacher: { userId: "user_1" },
            }),
          },
        }),
    },
    ApiError,
    utcDateToTashkentIsoDate: () => "2026-03-15",
    ensureMainOrganization: async () => ({ id: "org_1" }),
    monthKeyToUtcRange: () => ({
      periodStart: "2026-03-01T00:00:00.000Z",
      periodEnd: "2026-04-01T00:00:00.000Z",
    }),
    lockPayrollPeriodScope: async () => {},
    getActiveRunForPeriod: async () => null,
    resolvePayrollTeacherIdForLesson: (lesson) => lesson.teacherId,
    ensureEmployeeForTeacher: async () => ({ employee: { id: "emp_1" } }),
    isEmployeeLessonPayrollEligible: () => true,
    loadRatesForPeriod: async () => ({ teacherMap: new Map(), subjectMap: new Map() }),
    resolveRateForLesson: () => null,
    getOrCreatePayrollItem: async () => ({ id: "item_1" }),
    calcLessonAmount: () => decimalLike(0),
    recalculatePayrollRunAggregates: async () => {},
    createAuditLog: async () => {},
  };

  const result = await executeRefreshDraftPayrollForLesson({
    deps,
    lessonId: "lesson_1",
    actorUserId: "user_1",
    req: {},
  });

  assert.deepEqual(result, {
    runId: null,
    periodMonth: "2026-03",
    lessonId: "lesson_1",
    refreshed: false,
    skipped: true,
    reason: "LESSON_NOT_PAYROLL_ELIGIBLE",
  });
});

test("executeRefreshDraftPayrollForLesson replaces lesson line and recalculates affected payroll items", async () => {
  const deletedLineIds = [];
  const createdLines = [];
  const recalcCalls = [];
  let updatedRunPayload = null;

  const deps = {
    prisma: {
      $transaction: async (callback) =>
        callback({
          realLesson: {
            findFirst: async () => ({
              id: "lesson_1",
              teacherId: "teacher_1",
              status: "DONE",
              replacedByTeacherId: null,
              subjectId: "subject_1",
              classroomId: "class_1",
              startAt: "2026-03-15T08:00:00.000Z",
              durationMinutes: 90,
              teacher: { userId: "user_1" },
            }),
          },
          payrollLine: {
            findFirst: async () => ({ id: "line_old", payrollItemId: "item_old" }),
            delete: async ({ where }) => {
              deletedLineIds.push(where.id);
            },
            create: async ({ data }) => {
              createdLines.push(data);
              return { id: "line_new", ...data };
            },
          },
          payrollRun: {
            update: async ({ data }) => {
              updatedRunPayload = data;
              return { id: "run_1" };
            },
          },
        }),
    },
    ApiError,
    utcDateToTashkentIsoDate: () => "2026-03-15",
    ensureMainOrganization: async () => ({ id: "org_1" }),
    monthKeyToUtcRange: () => ({
      periodStart: "2026-03-01T00:00:00.000Z",
      periodEnd: "2026-04-01T00:00:00.000Z",
    }),
    lockPayrollPeriodScope: async () => {},
    getActiveRunForPeriod: async () => ({ id: "run_1", status: "DRAFT", generatedAt: null }),
    resolvePayrollTeacherIdForLesson: (lesson) => lesson.teacherId,
    ensureEmployeeForTeacher: async () => ({
      employee: {
        id: "emp_1",
        isPayrollEligible: true,
        employmentStatus: "ACTIVE",
        payrollMode: "LESSON_BASED",
      },
    }),
    isEmployeeLessonPayrollEligible: () => true,
    loadRatesForPeriod: async () => ({ teacherMap: new Map(), subjectMap: new Map() }),
    resolveRateForLesson: () => ({
      rateSource: "TEACHER_RATE",
      ratePerHour: decimalLike(70000),
      teacherRateId: "rate_1",
      subjectDefaultRateId: null,
    }),
    getOrCreatePayrollItem: async () => ({ id: "item_new" }),
    calcLessonAmount: () => decimalLike(105000),
    recalculatePayrollRunAggregates: async (_tx, payload) => {
      recalcCalls.push(payload);
    },
    createAuditLog: async () => {},
  };

  const result = await executeRefreshDraftPayrollForLesson({
    deps,
    lessonId: "lesson_1",
    actorUserId: "user_1",
    req: {},
  });

  assert.deepEqual(deletedLineIds, ["line_old"]);
  assert.equal(createdLines.length, 1);
  assert.equal(createdLines[0].type, "LESSON");
  assert.equal(createdLines[0].realLessonId, "lesson_1");
  assert.equal(String(createdLines[0].amount), "105000");
  assert.deepEqual(recalcCalls, [
    { payrollRunId: "run_1", payrollItemId: "item_old" },
    { payrollRunId: "run_1", payrollItemId: "item_new" },
  ]);
  assert.equal(updatedRunPayload.generationSummary.mode, "INCREMENTAL_LESSON_REFRESH");
  assert.equal(updatedRunPayload.generationSummary.lessonId, "lesson_1");
  assert.deepEqual(result, {
    runId: "run_1",
    periodMonth: "2026-03",
    lessonId: "lesson_1",
    refreshed: true,
    skipped: false,
    reason: null,
  });
});
