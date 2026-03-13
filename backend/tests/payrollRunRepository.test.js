const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getActiveRunForPeriod,
} = require("../src/services/payroll/repositories/payrollRunRepository");
const { ApiError } = require("../src/utils/apiError");

test("getActiveRunForPeriod rejects duplicate active runs", async () => {
  const tx = {
    payrollRun: {
      findMany: async () => ([
        { id: "run1", status: "DRAFT" },
        { id: "run2", status: "APPROVED" },
      ]),
    },
  };

  await assert.rejects(
    () => getActiveRunForPeriod(tx, {
      organizationId: "org1",
      periodMonth: "2026-03",
      activeStatuses: ["DRAFT", "APPROVED", "PAID"],
      ApiError,
    }),
    (error) => {
      assert.equal(error instanceof ApiError, true);
      assert.equal(error.code, "PAYROLL_RUN_PERIOD_CONFLICT");
      return true;
    },
  );
});
