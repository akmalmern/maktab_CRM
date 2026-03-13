const test = require("node:test");
const assert = require("node:assert/strict");
const {
  executeCalculateFinanceCashflow,
} = require("../src/controllers/admin/finance/useCases/calculateFinanceCashflow");

test("executeCalculateFinanceCashflow plan, debt va payroll oqimini hisoblaydi", async () => {
  const result = await executeCalculateFinanceCashflow({
    deps: {
      parseDebtTargetMonth: () => ({ year: 2026, month: 3 }),
      safeFormatMonthKey: (value) => value,
      startOfMonthUtc: (value) =>
        new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1)),
      isMonthChargeableForTarif: () => true,
      buildImtiyozMonthMap: ({ imtiyozlar, oylikSumma }) => {
        const map = new Map();
        for (const row of imtiyozlar) {
          if (row.monthKey) map.set(row.monthKey, row.amount);
        }
        if (!map.size) map.set("default", oylikSumma);
        return map;
      },
      fetchFinancePayrollCashflowRows: async () => [
        { entryType: "PAYROLL_PAYOUT", _sum: { amount: -200000 } },
        { entryType: "PAYROLL_REVERSAL", _sum: { amount: 50000 } },
      ],
      fetchFinanceCashflowPlanInputs: async () => ({
        students: [
          {
            id: "student-1",
            createdAt: new Date("2025-09-01T00:00:00.000Z"),
            enrollments: [{ startDate: new Date("2025-09-01T00:00:00.000Z") }],
          },
          {
            id: "student-2",
            createdAt: new Date("2025-09-01T00:00:00.000Z"),
            enrollments: [{ startDate: new Date("2025-09-01T00:00:00.000Z") }],
          },
        ],
        imtiyozRows: [
          { studentId: "student-1", monthKey: "2026-03", amount: 150000 },
        ],
        collectedAmount: 400000,
      }),
    },
    cohortStudentIds: ["student-1", "student-2"],
    settings: { oylikSumma: 300000 },
    cashflowMonthKey: "2026-03",
    currentMonthKey: "2026-03",
    selectedMonthKey: null,
    thisMonthDebtAmount: 300000,
    selectedMonthDebtAmount: 0,
  });

  assert.equal(result.planAmount, 450000);
  assert.equal(result.collectedAmount, 400000);
  assert.equal(result.payrollPayoutAmount, 200000);
  assert.equal(result.payrollReversalAmount, 50000);
  assert.equal(result.payrollNetAmount, -150000);
  assert.equal(result.netAmount, 250000);
  assert.equal(result.debtAmount, 300000);
  assert.equal(result.diffAmount, 50000);
});
