const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiError } = require("../src/utils/apiError");
const { executeGeneratePayrollRun } = require("../src/services/payroll/useCases/generatePayrollRun");

function decimalLike(value) {
  return {
    value: Number(value),
    neg() {
      return decimalLike(-this.value);
    },
    toString() {
      return String(this.value);
    },
  };
}

function createCommonDeps(tx) {
  return {
    prisma: {
      $transaction: async (callback) => callback(tx),
    },
    ApiError,
    DECIMAL_ZERO: decimalLike(0),
    REGENERATE_LINE_TYPES: ["LESSON", "FIXED_SALARY", "ADVANCE_DEDUCTION"],
    money: (value) => decimalLike(typeof value === "object" ? value.value : value),
    cleanOptional: (value) => {
      if (value === undefined || value === null) return undefined;
      const normalized = String(value).trim();
      return normalized || undefined;
    },
    ensureMainOrganization: async () => ({ id: "org_1" }),
    lockPayrollPeriodScope: async () => {},
    getActiveRunForPeriod: async () => null,
    resolvePayrollRunActorUserId: async () => "admin_1",
    loadRatesForPeriod: async () => ({ teacherMap: new Map(), subjectMap: new Map() }),
    ensureEmployeeForTeacher: async () => ({
      employee: {
        id: "emp_1",
        isPayrollEligible: true,
        employmentStatus: "ACTIVE",
        payrollMode: "LESSON_BASED",
      },
    }),
    isEmployeeLessonPayrollEligible: (employee) => Boolean(employee?.isPayrollEligible),
    resolvePayrollTeacherIdForLesson: (lesson) => lesson.replacedByTeacherId || lesson.teacherId,
    resolveRateForLesson: () => null,
    calcLessonAmount: (ratePerHour, minutes) => decimalLike(Number(ratePerHour?.value || ratePerHour) * Number(minutes)),
    getOrCreatePayrollItem: async () => ({ id: "item_1", employeeId: "emp_1", teacherId: "teacher_1" }),
    recalculatePayrollRunAggregates: async () => {},
    createAuditLog: async () => {},
    monthKeyToUtcRange: () => ({
      periodMonth: "2026-03",
      periodStart: "2026-03-01T00:00:00.000Z",
      periodEnd: "2026-04-01T00:00:00.000Z",
    }),
  };
}

test("executeGeneratePayrollRun rejects when eligible lessons have no rate", async () => {
  let createdRunPayload = null;
  let deleteManyArgs = null;

  const tx = {
    payrollRun: {
      create: async ({ data }) => {
        createdRunPayload = data;
        return { id: "run_1", status: "DRAFT", ...data };
      },
    },
    payrollLine: {
      deleteMany: async (args) => {
        deleteManyArgs = args;
      },
    },
    realLesson: {
      findMany: async () => [
        {
          id: "lesson_1",
          teacherId: "teacher_1",
          status: "DONE",
          replacedByTeacherId: null,
          subjectId: "subject_1",
          classroomId: "classroom_1",
          startAt: "2026-03-15T08:00:00.000Z",
          durationMinutes: 60,
        },
      ],
    },
    payrollItem: {
      findMany: async () => [],
    },
  };

  const deps = createCommonDeps(tx);

  await assert.rejects(
    executeGeneratePayrollRun({
      deps,
      body: { periodMonth: "2026-03" },
      actorUserId: "user_1",
      req: {},
    }),
    (error) => {
      assert.equal(error.code, "PAYROLL_RATE_NOT_FOUND");
      return true;
    },
  );

  assert.equal(createdRunPayload.organizationId, "org_1");
  assert.equal(createdRunPayload.periodMonth, "2026-03");
  assert.deepEqual(deleteManyArgs, {
    where: {
      payrollRunId: "run_1",
      type: { in: ["LESSON", "FIXED_SALARY", "ADVANCE_DEDUCTION"] },
    },
  });
});

test("executeGeneratePayrollRun creates lesson, fixed salary and advance lines then refreshes run snapshot", async () => {
  const createManyPayloads = [];
  let recalcPayload = null;
  let updatePayload = null;

  const tx = {
    payrollRun: {
      create: async () => {
        throw new Error("should not create run");
      },
      update: async ({ data }) => {
        updatePayload = data;
        return { id: "run_1" };
      },
      findUnique: async () => ({ id: "run_1", items: [] }),
    },
    payrollLine: {
      deleteMany: async () => {},
      createMany: async ({ data }) => {
        createManyPayloads.push(data);
      },
    },
    realLesson: {
      findMany: async () => [
        {
          id: "lesson_1",
          teacherId: "teacher_1",
          status: "DONE",
          replacedByTeacherId: null,
          subjectId: "subject_1",
          classroomId: "classroom_1",
          startAt: "2026-03-10T08:00:00.000Z",
          durationMinutes: 90,
        },
      ],
    },
    payrollItem: {
      findMany: async () => [],
    },
    employee: {
      findMany: async () => [
        {
          id: "emp_1",
          fixedSalaryAmount: decimalLike(3000000),
          teacher: { id: "teacher_1" },
        },
      ],
    },
    advancePayment: {
      findMany: async () => [
        {
          id: "adv_1",
          employeeId: "emp_1",
          teacherId: "teacher_1",
          amount: 100000,
          note: "  March advance  ",
          paidAt: "2026-03-05T09:00:00.000Z",
        },
      ],
    },
  };

  const deps = {
    ...createCommonDeps(tx),
    getActiveRunForPeriod: async () => ({
      id: "run_1",
      status: "DRAFT",
      generatedAt: null,
    }),
    loadRatesForPeriod: async () => ({ teacherMap: new Map(), subjectMap: new Map() }),
    resolveRateForLesson: () => ({
      rateSource: "TEACHER_RATE",
      ratePerHour: decimalLike(60000),
      teacherRateId: "rate_1",
      subjectDefaultRateId: null,
    }),
    calcLessonAmount: () => decimalLike(90000),
    getOrCreatePayrollItem: async () => ({
      id: "item_1",
      employeeId: "emp_1",
      teacherId: "teacher_1",
    }),
    recalculatePayrollRunAggregates: async (_tx, payload) => {
      recalcPayload = payload;
    },
  };

  const result = await executeGeneratePayrollRun({
    deps,
    body: { periodMonth: "2026-03" },
    actorUserId: "user_1",
    req: {},
  });

  assert.equal(createManyPayloads.length, 3);
  assert.equal(createManyPayloads[0][0].type, "LESSON");
  assert.equal(createManyPayloads[0][0].realLessonId, "lesson_1");
  assert.equal(String(createManyPayloads[0][0].amount), "90000");
  assert.equal(createManyPayloads[1][0].type, "FIXED_SALARY");
  assert.equal(String(createManyPayloads[1][0].amount), "3000000");
  assert.equal(createManyPayloads[2][0].type, "ADVANCE_DEDUCTION");
  assert.equal(String(createManyPayloads[2][0].amount), "-100000");
  assert.equal(createManyPayloads[2][0].description, "March advance");
  assert.deepEqual(recalcPayload, { payrollRunId: "run_1" });
  assert.equal(updatePayload.generationSummary.periodMonth, "2026-03");
  assert.equal(updatePayload.generationSummary.lessonCount, 1);
  assert.equal(updatePayload.generationSummary.fixedSalaryCount, 1);
  assert.equal(updatePayload.generationSummary.advanceCount, 1);
  assert.equal(result.run.id, "run_1");
  assert.deepEqual(result.generation, { lessonsProcessed: 1 });
});
