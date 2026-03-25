const test = require("node:test");
const assert = require("node:assert/strict");

const { ApiError } = require("../src/utils/apiError");
const { createPayrollRunRepoAdapters } = require("../src/services/payroll/shared/payrollRunRepoAdapters");

function createAdapters(overrides = {}) {
  return createPayrollRunRepoAdapters({
    getActiveRunForPeriodRepo: async () => null,
    lockPayrollPeriodScopeRepo: async () => {},
    getPayrollRunOrThrowRepo: async () => ({ id: "run_1" }),
    lockPayrollRunRowRepo: async () => {},
    lockPayrollItemRowRepo: async () => {},
    activeStatuses: ["DRAFT", "APPROVED", "PAID"],
    ApiError,
    ...overrides,
  });
}

test("getActiveRunForPeriod repo ga configured activeStatuses va ApiError uzatadi", async () => {
  let forwarded = null;
  const { getActiveRunForPeriod } = createAdapters({
    getActiveRunForPeriodRepo: async (_tx, payload) => {
      forwarded = payload;
      return { id: "run_1" };
    },
  });

  const result = await getActiveRunForPeriod(
    { tx: true },
    {
      organizationId: "org_1",
      periodMonth: "2026-03",
    },
  );

  assert.equal(result.id, "run_1");
  assert.deepEqual(forwarded.organizationId, "org_1");
  assert.deepEqual(forwarded.periodMonth, "2026-03");
  assert.deepEqual(forwarded.activeStatuses, ["DRAFT", "APPROVED", "PAID"]);
  assert.equal(forwarded.ApiError, ApiError);
});

test("run/item lock va getPayrollRunOrThrow adapterlari payloadni forward qiladi", async () => {
  const calls = [];
  const adapters = createAdapters({
    lockPayrollPeriodScopeRepo: async (_tx, payload) => {
      calls.push(["period", payload]);
    },
    getPayrollRunOrThrowRepo: async (_tx, payload) => {
      calls.push(["get", payload]);
      return { id: payload.runId };
    },
    lockPayrollRunRowRepo: async (_tx, payload) => {
      calls.push(["run", payload]);
    },
    lockPayrollItemRowRepo: async (_tx, payload) => {
      calls.push(["item", payload]);
    },
  });

  await adapters.lockPayrollPeriodScope({}, { organizationId: "org_1", periodMonth: "2026-03" });
  const run = await adapters.getPayrollRunOrThrow({}, { runId: "run_1", organizationId: "org_1" });
  await adapters.lockPayrollRunRow({}, { runId: "run_1", organizationId: "org_1" });
  await adapters.lockPayrollItemRow({}, { itemId: "item_1", runId: "run_1", organizationId: "org_1" });

  assert.equal(run.id, "run_1");
  assert.deepEqual(calls[0], ["period", { organizationId: "org_1", periodMonth: "2026-03" }]);
  assert.equal(calls[1][0], "get");
  assert.equal(calls[1][1].runId, "run_1");
  assert.equal(calls[1][1].organizationId, "org_1");
  assert.equal(calls[1][1].ApiError, ApiError);
  assert.deepEqual(calls[2], ["run", { runId: "run_1", organizationId: "org_1" }]);
  assert.deepEqual(calls[3], ["item", { itemId: "item_1", runId: "run_1", organizationId: "org_1" }]);
});
