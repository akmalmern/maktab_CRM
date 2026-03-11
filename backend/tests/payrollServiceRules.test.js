const test = require("node:test");
const assert = require("node:assert/strict");
const { Prisma } = require("@prisma/client");
const payrollService = require("../src/services/payroll/payrollService");

const { isEmployeeLessonPayrollEligible, buildItemSummaryFromLines } = payrollService.__private;

test("isEmployeeLessonPayrollEligible faqat ACTIVE + eligible + LESSON_BASED/MIXED uchun true", () => {
  assert.equal(
    isEmployeeLessonPayrollEligible({
      isPayrollEligible: true,
      employmentStatus: "ACTIVE",
      payrollMode: "LESSON_BASED",
    }),
    true,
  );
  assert.equal(
    isEmployeeLessonPayrollEligible({
      isPayrollEligible: true,
      employmentStatus: "ACTIVE",
      payrollMode: "MIXED",
    }),
    true,
  );
  assert.equal(
    isEmployeeLessonPayrollEligible({
      isPayrollEligible: false,
      employmentStatus: "ACTIVE",
      payrollMode: "LESSON_BASED",
    }),
    false,
  );
  assert.equal(
    isEmployeeLessonPayrollEligible({
      isPayrollEligible: true,
      employmentStatus: "ARCHIVED",
      payrollMode: "LESSON_BASED",
    }),
    false,
  );
  assert.equal(
    isEmployeeLessonPayrollEligible({
      isPayrollEligible: true,
      employmentStatus: "ACTIVE",
      payrollMode: "MANUAL_ONLY",
    }),
    false,
  );
});

test("buildItemSummaryFromLines manfiy net payable ni 0 ga clamp qiladi", () => {
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
