const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiError } = require("../src/utils/apiError");
const {
  executeListPayrollEmployees,
  executeUpdatePayrollEmployeeConfig,
} = require("../src/services/payroll/useCases/managePayrollEmployees");
const {
  executeAddPayrollAdjustment,
  executeDeletePayrollAdjustment,
} = require("../src/services/payroll/useCases/managePayrollAdjustments");

function decimalLike(value) {
  return {
    value: Number(value),
    lte(other) {
      const otherValue = typeof other === "object" && other !== null ? Number(other.value) : Number(other);
      return this.value <= otherValue;
    },
    neg() {
      return decimalLike(-this.value);
    },
    toString() {
      return String(this.value);
    },
  };
}

test("executeListPayrollEmployees clamps page/limit and trims search", async () => {
  let findManyArgs = null;
  const deps = {
    prisma: {
      $transaction: async (callback) => callback({
        employee: {
          findMany: async (args) => {
            findManyArgs = args;
            return [{ id: "emp_1" }];
          },
          count: async () => 1,
        },
      }),
    },
    ensureMainOrganization: async () => ({ id: "org_1" }),
    cleanOptional: (value) => {
      const normalized = String(value || "").trim();
      return normalized || undefined;
    },
    mapPayrollEmployeeConfigRow: (row) => ({ ...row, mapped: true }),
  };

  const result = await executeListPayrollEmployees({
    deps,
    query: { page: "0", limit: "500", search: "  ali  ", kind: "TEACHER" },
  });

  assert.equal(result.page, 1);
  assert.equal(result.limit, 100);
  assert.equal(findManyArgs.skip, 0);
  assert.equal(findManyArgs.where.kind, "TEACHER");
  assert.equal(findManyArgs.where.OR[0].firstName.contains, "ali");
  assert.equal(result.employees[0].mapped, true);
});

test("executeUpdatePayrollEmployeeConfig rejects FIXED mode without positive salary", async () => {
  const deps = {
    prisma: {
      $transaction: async (callback) => callback({
        employee: {
          findFirst: async () => ({
            id: "emp_1",
            organizationId: "org_1",
            payrollMode: "LESSON_BASED",
            fixedSalaryAmount: null,
            isPayrollEligible: true,
            employmentStatus: "ACTIVE",
            note: null,
          }),
        },
      }),
    },
    ApiError,
    ensureMainOrganization: async () => ({ id: "org_1" }),
    money: decimalLike,
    decimal: decimalLike,
    DECIMAL_ZERO: decimalLike(0),
    cleanOptional: (value) => value,
    createAuditLog: async () => {},
    mapPayrollEmployeeConfigRow: (row) => row,
  };

  await assert.rejects(
    executeUpdatePayrollEmployeeConfig({
      deps,
      employeeId: "emp_1",
      body: { payrollMode: "FIXED" },
      actorUserId: "user_1",
      req: {},
    }),
    (error) => {
      assert.equal(error.code, "PAYROLL_FIXED_SALARY_REQUIRED");
      return true;
    },
  );
});

test("executeAddPayrollAdjustment creates negative amount for PENALTY and backfills employee from teacher", async () => {
  let createdPayload = null;
  let recalcPayload = null;
  const deps = {
    prisma: {
      $transaction: async (callback) => callback({
        payrollLine: {
          create: async ({ data }) => {
            createdPayload = data;
            return { id: "line_1", ...data };
          },
        },
      }),
    },
    ApiError,
    ensureMainOrganization: async () => ({ id: "org_1" }),
    getPayrollRunOrThrow: async () => ({ id: "run_1", status: "DRAFT" }),
    assertRunStatus: () => {},
    assertEmployeeExists: async () => null,
    assertTeacherExists: async () => ({ id: "teacher_1" }),
    ensureEmployeeForTeacher: async () => ({
      employee: { id: "emp_1", teacher: { id: "teacher_1" } },
      teacher: { id: "teacher_1" },
    }),
    getOrCreatePayrollItem: async () => ({ id: "item_1" }),
    money: decimalLike,
    recalculatePayrollRunAggregates: async (_tx, payload) => {
      recalcPayload = payload;
    },
    createAuditLog: async () => {},
  };

  const result = await executeAddPayrollAdjustment({
    deps,
    runId: "run_1",
    body: {
      teacherId: "teacher_1",
      type: "PENALTY",
      amount: 120000,
      description: "Kechikish",
    },
    actorUserId: "user_1",
    req: {},
  });

  assert.equal(result.line.id, "line_1");
  assert.equal(createdPayload.employeeId, "emp_1");
  assert.equal(createdPayload.teacherId, "teacher_1");
  assert.equal(String(createdPayload.amount), "-120000");
  assert.deepEqual(recalcPayload, {
    payrollRunId: "run_1",
    payrollItemId: "item_1",
  });
});

test("executeDeletePayrollAdjustment forbids deleting non-manual payroll line", async () => {
  const deps = {
    prisma: {
      $transaction: async (callback) => callback({
        payrollLine: {
          findFirst: async () => ({
            id: "line_1",
            payrollItemId: "item_1",
            type: "LESSON",
            amount: decimalLike(50000),
            description: "Lesson",
            teacherId: "teacher_1",
            employeeId: "emp_1",
          }),
        },
      }),
    },
    ApiError,
    ensureMainOrganization: async () => ({ id: "org_1" }),
    getPayrollRunOrThrow: async () => ({ id: "run_1", status: "DRAFT" }),
    assertRunStatus: () => {},
    MANUAL_ADJUSTMENT_TYPES: new Set(["BONUS", "PENALTY", "MANUAL"]),
    recalculatePayrollRunAggregates: async () => {},
    createAuditLog: async () => {},
  };

  await assert.rejects(
    executeDeletePayrollAdjustment({
      deps,
      runId: "run_1",
      lineId: "line_1",
      actorUserId: "user_1",
      req: {},
    }),
    (error) => {
      assert.equal(error.code, "PAYROLL_LINE_DELETE_FORBIDDEN");
      return true;
    },
  );
});
