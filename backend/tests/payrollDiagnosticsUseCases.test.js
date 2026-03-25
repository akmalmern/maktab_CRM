const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiError } = require("../src/utils/apiError");
const {
  executeGetPayrollAutomationHealth,
  executeGetPayrollMonthlyReport,
} = require("../src/services/payroll/useCases/queryPayrollDiagnostics");

function toNumber(value) {
  return typeof value === "object" && value !== null ? Number(value.value ?? value.toString?.()) : Number(value);
}

function decimalLike(value) {
  const numericValue = toNumber(value);
  return {
    value: numericValue,
    plus(other) {
      return decimalLike(this.value + toNumber(other));
    },
    minus(other) {
      return decimalLike(this.value - toNumber(other));
    },
    div(other) {
      return decimalLike(this.value / toNumber(other));
    },
    abs() {
      return decimalLike(Math.abs(this.value));
    },
    lte(other) {
      return this.value <= toNumber(other);
    },
    toString() {
      return String(this.value);
    },
  };
}

function createBaseDeps(tx) {
  return {
    prisma: {
      $transaction: async (callback) => callback(tx),
    },
    ApiError,
    DECIMAL_ZERO: decimalLike(0),
    money: (value) => decimalLike(value),
    decimal: (value) => decimalLike(value),
    ensureMainOrganization: async () => ({ id: "org_1" }),
    monthKeyToUtcRange: () => ({
      periodStart: "2026-03-01T00:00:00.000Z",
      periodEnd: "2026-04-01T00:00:00.000Z",
    }),
    getActiveRunForPeriod: async () => null,
    loadRatesForPeriod: async () => ({ teacherMap: new Map(), subjectMap: new Map() }),
    isEmployeeLessonPayrollEligible: () => true,
    resolvePayrollTeacherIdForLesson: (lesson) => {
      if (lesson.status === "REPLACED" && !lesson.replacedByTeacherId) {
        throw new ApiError(
          409,
          "REAL_LESSON_REPLACED_TEACHER_REQUIRED",
          "replacement teacher required",
        );
      }
      return lesson.replacedByTeacherId || lesson.teacherId;
    },
    resolveRateForLesson: () => null,
  };
}

test("executeGetPayrollAutomationHealth returns blocker for replaced lessons without replacement teacher", async () => {
  const tx = {
    realLesson: {
      findMany: async () => [
        {
          id: "lesson_1",
          teacherId: "teacher_1",
          status: "REPLACED",
          replacedByTeacherId: null,
          subjectId: "subject_1",
          classroomId: "class_1",
          startAt: "2026-03-11T08:00:00.000Z",
          durationMinutes: 60,
        },
      ],
    },
    employee: {
      findMany: async () => [],
    },
    teacher: {
      findMany: async () => [
        {
          id: "teacher_1",
          firstName: "Ali",
          lastName: "Valiyev",
          employeeId: null,
          user: { username: "ali" },
        },
      ],
    },
    darsJadvali: {
      findMany: async () => [],
    },
    teacherWorkloadPlan: {
      findMany: async () => [],
    },
    payrollRun: {
      findMany: async () => [],
    },
  };

  const result = await executeGetPayrollAutomationHealth({
    deps: createBaseDeps(tx),
    periodMonth: "2026-03",
    includeDetails: false,
  });

  assert.equal(result.summary.blockerCount, 1);
  assert.deepEqual(result.summary.blockingCodes, ["REAL_LESSON_REPLACED_TEACHER_REQUIRED"]);
  assert.equal(result.metrics.invalidReplacedLessonCount, 1);
  assert.equal(result.currentRun, null);
});

test("executeGetPayrollMonthlyReport builds payout and payment summaries from run data", async () => {
  const tx = {
    realLesson: {
      findMany: async () => [
        {
          id: "lesson_1",
          teacherId: "teacher_1",
          status: "DONE",
          replacedByTeacherId: null,
          subjectId: "subject_1",
          classroomId: "class_1",
          startAt: "2026-03-10T08:00:00.000Z",
          durationMinutes: 90,
        },
      ],
    },
    employee: {
      findMany: async () => [
        {
          id: "emp_1",
          payrollMode: "LESSON_BASED",
          employmentStatus: "ACTIVE",
          isPayrollEligible: true,
          fixedSalaryAmount: decimalLike(0),
          teacher: {
            id: "teacher_1",
            firstName: "Ali",
            lastName: "Valiyev",
            user: { username: "ali" },
          },
          user: { username: "ali", isActive: true },
        },
      ],
    },
    teacher: {
      findMany: async () => [
        {
          id: "teacher_1",
          firstName: "Ali",
          lastName: "Valiyev",
          employeeId: "emp_1",
          user: { username: "ali" },
        },
      ],
    },
    darsJadvali: {
      findMany: async () => [
        {
          id: "schedule_1",
          oqituvchiId: "teacher_1",
          haftaKuni: "DUSHANBA",
          vaqtOraliq: { boshlanishVaqti: "08:00", tugashVaqti: "09:30" },
        },
      ],
    },
    teacherWorkloadPlan: {
      findMany: async () => [{ id: "plan_1", teacherId: "teacher_1", weeklyMinutesLimit: 180, note: null }],
    },
    payrollRun: {
      findMany: async () => [
        {
          id: "run_1",
          status: "DRAFT",
          createdAt: "2026-03-20T10:00:00.000Z",
          generatedAt: null,
          approvedAt: null,
          paidAt: null,
          payableAmount: decimalLike(250000),
          grossAmount: decimalLike(300000),
          adjustmentAmount: decimalLike(-50000),
        },
      ],
    },
    payrollItem: {
      findMany: async () => [
        {
          id: "item_1",
          teacherId: "teacher_1",
          employeeId: "emp_1",
          paymentStatus: "PARTIAL",
          totalMinutes: 90,
          totalHours: decimalLike(1.5),
          grossAmount: decimalLike(300000),
          adjustmentAmount: decimalLike(-50000),
          payableAmount: decimalLike(250000),
          paidAmount: decimalLike(100000),
          employee: {
            id: "emp_1",
            kind: "TEACHER",
            firstName: "Ali",
            lastName: "Valiyev",
            user: { username: "ali" },
          },
          teacher: null,
          teacherFirstNameSnapshot: null,
          teacherLastNameSnapshot: null,
          teacherUsernameSnapshot: null,
        },
      ],
    },
    payrollItemPayment: {
      findMany: async () => [
        {
          id: "payment_1",
          amount: decimalLike(100000),
          paymentMethod: "BANK",
          paidAt: "2026-03-21T09:00:00.000Z",
          payrollItemId: "item_1",
        },
      ],
    },
    payrollLine: {
      findMany: async () => [
        { id: "line_1", type: "LESSON", amount: decimalLike(300000) },
        { id: "line_2", type: "ADVANCE_DEDUCTION", amount: decimalLike(-50000) },
      ],
    },
  };

  const result = await executeGetPayrollMonthlyReport({
    deps: {
      ...createBaseDeps(tx),
      getActiveRunForPeriod: async () => ({
        id: "run_1",
        grossAmount: decimalLike(300000),
        adjustmentAmount: decimalLike(-50000),
        payableAmount: decimalLike(250000),
      }),
      resolveRateForLesson: () => ({
        rateSource: "TEACHER_RATE",
        ratePerHour: decimalLike(60000),
        teacherRateId: "rate_1",
        subjectDefaultRateId: null,
      }),
    },
    periodMonth: "2026-03",
    includeDetails: true,
  });

  assert.equal(result.run.id, "run_1");
  assert.equal(result.summary.paymentCount, 1);
  assert.equal(result.summary.paidTeacherCount, 0);
  assert.equal(String(result.summary.paidAmount), "100000");
  assert.equal(String(result.summary.remainingAmount), "150000");
  assert.equal(result.payoutBreakdown[0].ownerName, "Ali Valiyev (@ali)");
  assert.equal(result.paymentMethodBreakdown[0].paymentMethod, "BANK");
  assert.equal(String(result.paymentMethodBreakdown[0].amount), "100000");
  assert.equal(result.lineTypeBreakdown[0].type, "LESSON");
  assert.equal(String(result.lineTypeBreakdown[0].amount), "300000");
  assert.equal(result.health.summary.blockerCount, 0);
});
