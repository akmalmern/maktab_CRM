const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiError } = require("../src/utils/apiError");
const payrollQueries = require("../src/services/payroll/useCases/queryPayroll");

function createDeps(txOverrides = {}) {
  const tx = {
    payrollRun: {
      findMany: async () => [],
      count: async () => 0,
      findFirst: async () => null,
    },
    payrollLine: {
      findMany: async () => [],
      count: async () => 0,
      groupBy: async () => [],
    },
    payrollItem: {
      findMany: async () => [],
      count: async () => 0,
      findFirst: async () => null,
    },
    teacher: {
      findUnique: async () => null,
    },
    subject: {
      findMany: async () => [],
    },
    ...txOverrides,
  };

  return {
    deps: {
      prisma: {
        $transaction: async (callback) => callback(tx),
      },
      ApiError,
      ensureMainOrganization: async () => ({ id: "org_1" }),
      money: (value) => Number(value),
      decimal: (value) => ({
        div(divisor) {
          return Number(value) / Number(divisor);
        },
      }),
      buildCsv: (rows) => rows.map((row) => row.join(",")).join("\n"),
      toIsoOrEmpty: (value) => (value ? new Date(value).toISOString() : ""),
    },
    tx,
  };
}

test("executeListPayrollRuns applies organization and pagination filters", async () => {
  const calls = { findMany: null, count: null };
  const { deps } = createDeps({
    payrollRun: {
      findMany: async (args) => {
        calls.findMany = args;
        return [{ id: "run_1" }];
      },
      count: async (args) => {
        calls.count = args;
        return 1;
      },
      findFirst: async () => null,
    },
  });

  const result = await payrollQueries.executeListPayrollRuns({
    deps,
    query: { page: "2", limit: "30", status: "DRAFT", periodMonth: "2026-03" },
  });

  assert.equal(result.page, 2);
  assert.equal(result.limit, 30);
  assert.equal(result.total, 1);
  assert.deepEqual(calls.findMany.where, {
    organizationId: "org_1",
    status: "DRAFT",
    periodMonth: "2026-03",
  });
  assert.equal(calls.findMany.skip, 30);
  assert.deepEqual(calls.count.where, calls.findMany.where);
});

test("executeGetPayrollRunDetail appends lesson breakdown to payroll items", async () => {
  const { deps } = createDeps({
    payrollRun: {
      findMany: async () => [],
      count: async () => 0,
      findFirst: async () => ({
        id: "run_1",
        status: "DRAFT",
        items: [{ id: "item_1", payableAmount: 120000 }],
      }),
    },
    payrollLine: {
      findMany: async () => [{ id: "line_1", type: "LESSON" }],
      count: async () => 1,
      groupBy: async () => [{
        payrollItemId: "item_1",
        subjectId: "subject_1",
        ratePerHour: 50000,
        rateSource: "TEACHER_RATE",
        _sum: { minutes: 180, amount: 150000 },
        _count: { _all: 3 },
      }],
    },
    subject: {
      findMany: async () => [{ id: "subject_1", name: "Matematika" }],
    },
  });

  const result = await payrollQueries.executeGetPayrollRunDetail({
    deps,
    runId: "run_1",
    query: { page: "1", limit: "20" },
  });

  assert.equal(result.run.items.length, 1);
  assert.equal(result.run.items[0].primarySubjectName, "Matematika");
  assert.equal(result.run.items[0].subjectBreakdown.length, 1);
  assert.equal(result.lines.total, 1);
});

test("executeGetTeacherPayslipsByUserId builds payrollRun relation filter", async () => {
  let findManyArgs = null;
  const { deps } = createDeps({
    teacher: {
      findUnique: async () => ({ id: "teacher_1", firstName: "Ali", lastName: "Valiyev", user: { username: "ali" } }),
    },
    payrollItem: {
      findMany: async (args) => {
        findManyArgs = args;
        return [{ id: "item_1" }];
      },
      count: async () => 1,
      findFirst: async () => null,
    },
  });

  const result = await payrollQueries.executeGetTeacherPayslipsByUserId({
    deps,
    userId: "user_1",
    query: { status: "PAID", periodMonth: "2026-03" },
  });

  assert.equal(result.teacher.id, "teacher_1");
  assert.equal(result.total, 1);
  assert.deepEqual(findManyArgs.where, {
    teacherId: "teacher_1",
    payrollRun: {
      is: {
        status: "PAID",
        periodMonth: "2026-03",
      },
    },
  });
});

test("executeGetTeacherPayslipDetailByUserId throws PAYSLIP_NOT_FOUND when item missing", async () => {
  const { deps } = createDeps({
    teacher: {
      findUnique: async () => ({ id: "teacher_1", firstName: "Ali", lastName: "Valiyev", user: { username: "ali" } }),
    },
  });

  await assert.rejects(
    payrollQueries.executeGetTeacherPayslipDetailByUserId({
      deps,
      userId: "user_1",
      runId: "run_404",
      query: {},
    }),
    (error) => {
      assert.equal(error.code, "PAYSLIP_NOT_FOUND");
      return true;
    },
  );
});
