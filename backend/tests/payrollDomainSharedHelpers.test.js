const test = require("node:test");
const assert = require("node:assert/strict");
const { Prisma } = require("@prisma/client");

const { ApiError } = require("../src/utils/apiError");
const { createPayrollAssertions } = require("../src/services/payroll/shared/payrollAssertions");
const { createPayrollItemDomain } = require("../src/services/payroll/shared/payrollItemDomain");

function decimal(value) {
  if (value instanceof Prisma.Decimal) return value;
  if (value === undefined || value === null) return new Prisma.Decimal(0);
  return new Prisma.Decimal(value);
}

function money(value) {
  return decimal(value).toDecimalPlaces(2);
}

test("assertNoTeacherRateOverlap throws overlap error when interval collides", async () => {
  const { assertNoTeacherRateOverlap } = createPayrollAssertions({ ApiError });

  await assert.rejects(
    assertNoTeacherRateOverlap(
      {
        teacherRate: {
          findFirst: async () => ({ id: "rate_1" }),
        },
      },
      {
        organizationId: "org_1",
        teacherId: "teacher_1",
        subjectId: "subject_1",
        effectiveFrom: "2026-03-01T00:00:00.000Z",
        effectiveTo: null,
      },
    ),
    (error) => {
      assert.equal(error.code, "TEACHER_RATE_OVERLAP");
      return true;
    },
  );
});

test("getOrCreatePayrollItem rejects mismatched employee and teacher ownership", async () => {
  const { getOrCreatePayrollItem } = createPayrollItemDomain({
    ApiError,
    Prisma,
    decimal,
    money,
    DECIMAL_ZERO: new Prisma.Decimal(0),
  });

  await assert.rejects(
    getOrCreatePayrollItem(
      {
        employee: {
          findFirst: async () => ({
            id: "emp_1",
            firstName: "Ali",
            lastName: "Valiyev",
            user: { username: "ali" },
            teacher: { id: "teacher_2", firstName: "Ali", lastName: "Valiyev" },
          }),
        },
        teacher: {
          findUnique: async () => ({ id: "teacher_1", firstName: "Ali", lastName: "Valiyev", user: { username: "ali" } }),
        },
      },
      {
        organizationId: "org_1",
        payrollRunId: "run_1",
        employeeId: "emp_1",
        teacherId: "teacher_1",
      },
    ),
    (error) => {
      assert.equal(error.code, "PAYROLL_ITEM_OWNER_MISMATCH");
      return true;
    },
  );
});

test("buildItemSummaryFromLines clamps negative payable amount to zero", () => {
  const { buildItemSummaryFromLines } = createPayrollItemDomain({
    ApiError,
    Prisma,
    decimal,
    money,
    DECIMAL_ZERO: new Prisma.Decimal(0),
  });

  const summary = buildItemSummaryFromLines([
    {
      type: "LESSON",
      amount: new Prisma.Decimal(100000),
      minutes: 60,
    },
    {
      type: "ADVANCE_DEDUCTION",
      amount: new Prisma.Decimal(-250000),
    },
  ]);

  assert.equal(String(summary.grossAmount), "100000");
  assert.equal(String(summary.adjustmentAmount), "-250000");
  assert.equal(String(summary.payableAmount), "0");
});
