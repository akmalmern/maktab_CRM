const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiError } = require("../src/utils/apiError");
const {
  executeListAdvancePayments,
  executeCreateAdvancePayment,
  executeDeleteAdvancePayment,
} = require("../src/services/payroll/useCases/manageAdvancePayments");

function toNumber(value) {
  return typeof value === "object" && value !== null ? Number(value.value ?? value.toString?.()) : Number(value);
}

function decimalLike(value) {
  const numericValue = toNumber(value);
  return {
    value: numericValue,
    neg() {
      return decimalLike(-this.value);
    },
    toString() {
      return String(this.value);
    },
  };
}

test("executeListAdvancePayments clamps page/limit and applies filters", async () => {
  let findManyArgs = null;
  let countArgs = null;

  const deps = {
    prisma: {
      $transaction: async (callback) =>
        callback({
          advancePayment: {
            findMany: async (args) => {
              findManyArgs = args;
              return [{ id: "advance_1" }];
            },
            count: async (args) => {
              countArgs = args;
              return 1;
            },
          },
        }),
    },
    ensureMainOrganization: async () => ({ id: "org_1" }),
  };

  const result = await executeListAdvancePayments({
    deps,
    query: { page: "0", limit: "500", periodMonth: "2026-03", teacherId: "teacher_1" },
  });

  assert.equal(result.page, 1);
  assert.equal(result.limit, 100);
  assert.equal(findManyArgs.skip, 0);
  assert.equal(findManyArgs.take, 100);
  assert.deepEqual(findManyArgs.where, {
    organizationId: "org_1",
    periodMonth: "2026-03",
    teacherId: "teacher_1",
  });
  assert.deepEqual(countArgs.where, findManyArgs.where);
});

test("executeCreateAdvancePayment backfills employee from teacher and syncs draft payroll run", async () => {
  let createdAdvancePayload = null;
  let createdPayrollLine = null;
  let updatedRunPayload = null;
  let recalcPayload = null;

  const deps = {
    prisma: {
      $transaction: async (callback) =>
        callback({
          advancePayment: {
            create: async ({ data }) => {
              createdAdvancePayload = data;
              return { id: "advance_1", ...data };
            },
          },
          payrollLine: {
            create: async ({ data }) => {
              createdPayrollLine = data;
              return { id: "line_1", ...data };
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
    ensureMainOrganization: async () => ({ id: "org_1" }),
    assertEmployeeExists: async () => null,
    assertTeacherExists: async () => ({ id: "teacher_1" }),
    ensureEmployeeForTeacher: async () => ({
      employee: { id: "emp_1", teacher: { id: "teacher_1" } },
      teacher: { id: "teacher_1" },
    }),
    getActiveRunForPeriod: async () => ({ id: "run_1", status: "DRAFT" }),
    money: (value) => decimalLike(value),
    cleanOptional: (value) => {
      if (value === undefined || value === null) return undefined;
      const normalized = String(value).trim();
      return normalized || undefined;
    },
    monthKeyFromDateValue: () => "2026-03",
    monthKeyToUtcRange: () => ({
      periodStart: "2026-03-01T00:00:00.000Z",
      periodEnd: "2026-04-01T00:00:00.000Z",
    }),
    getOrCreatePayrollItem: async () => ({ id: "item_1" }),
    recalculatePayrollRunAggregates: async (_tx, payload) => {
      recalcPayload = payload;
    },
    createAuditLog: async () => {},
  };

  const result = await executeCreateAdvancePayment({
    deps,
    body: {
      teacherId: "teacher_1",
      amount: 120000,
      paidAt: "2026-03-12T09:00:00.000Z",
      note: "  Mart avansi  ",
    },
    actorUserId: "user_1",
    req: {},
  });

  assert.equal(result.syncedRunId, "run_1");
  assert.equal(createdAdvancePayload.organizationId, "org_1");
  assert.equal(createdAdvancePayload.employeeId, "emp_1");
  assert.equal(createdAdvancePayload.teacherId, "teacher_1");
  assert.equal(createdAdvancePayload.periodMonth, "2026-03");
  assert.equal(String(createdAdvancePayload.amount), "120000");
  assert.equal(createdPayrollLine.type, "ADVANCE_DEDUCTION");
  assert.equal(String(createdPayrollLine.amount), "-120000");
  assert.equal(createdPayrollLine.description, "Mart avansi");
  assert.deepEqual(recalcPayload, { payrollRunId: "run_1", payrollItemId: "item_1" });
  assert.equal(updatedRunPayload.generationSummary.mode, "ADVANCE_SYNC");
  assert.equal(updatedRunPayload.generationSummary.advancePaymentId, "advance_1");
});

test("executeDeleteAdvancePayment removes synced lines and recalculates affected payroll items", async () => {
  let deletedLineIds = null;
  const recalcCalls = [];
  let deletedAdvanceId = null;
  let updatedRunPayload = null;

  const deps = {
    prisma: {
      $transaction: async (callback) =>
        callback({
          advancePayment: {
            findFirst: async () => ({
              id: "advance_1",
              periodMonth: "2026-03",
              employeeId: "emp_1",
              teacherId: "teacher_1",
              amount: decimalLike(120000),
              paidAt: "2026-03-12T09:00:00.000Z",
              payrollLines: [
                { id: "line_1", payrollRunId: "run_1", payrollItemId: "item_1" },
                { id: "line_2", payrollRunId: "run_1", payrollItemId: "item_2" },
              ],
            }),
            delete: async ({ where }) => {
              deletedAdvanceId = where.id;
            },
          },
          payrollLine: {
            deleteMany: async ({ where }) => {
              deletedLineIds = where.id.in;
            },
          },
          payrollRun: {
            findMany: async () => [{ id: "run_1", status: "DRAFT" }],
            update: async ({ data }) => {
              updatedRunPayload = data;
              return { id: "run_1" };
            },
          },
        }),
    },
    ApiError,
    ensureMainOrganization: async () => ({ id: "org_1" }),
    getActiveRunForPeriod: async () => ({ id: "run_1", status: "DRAFT" }),
    recalculatePayrollRunAggregates: async (_tx, payload) => {
      recalcCalls.push(payload);
    },
    createAuditLog: async () => {},
  };

  const result = await executeDeleteAdvancePayment({
    deps,
    advanceId: "advance_1",
    actorUserId: "user_1",
    req: {},
  });

  assert.deepEqual(deletedLineIds, ["line_1", "line_2"]);
  assert.deepEqual(recalcCalls, [
    { payrollRunId: "run_1", payrollItemId: "item_1" },
    { payrollRunId: "run_1", payrollItemId: "item_2" },
  ]);
  assert.equal(updatedRunPayload.generationSummary.mode, "ADVANCE_SYNC");
  assert.equal(updatedRunPayload.generationSummary.deletedAdvancePaymentId, "advance_1");
  assert.equal(deletedAdvanceId, "advance_1");
  assert.deepEqual(result, { ok: true, affectedRunIds: ["run_1"] });
});
