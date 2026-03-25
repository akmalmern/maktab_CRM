const test = require("node:test");
const assert = require("node:assert/strict");

const { createPayrollDepsBuilders } = require("../src/services/payroll/shared/payrollDepsBuilders");

test("buildPayrollUseCaseDeps core deps va service actionlarni to'g'ri compose qiladi", async () => {
  const calls = [];
  const builders = createPayrollDepsBuilders({
    coreDeps: {
      prisma: { id: "prisma" },
      ApiError: function ApiError() {},
      DECIMAL_ZERO: 0,
      foo: "bar",
    },
    diagnosticsDeps: {
      money: "moneyFn",
    },
    queryDeps: {
      buildCsv: "csvFn",
    },
    serviceActions: {
      refreshDraftPayrollForLesson: async ({ lessonId }) => ({ lessonId, ok: true }),
      recalculatePayrollRunAggregates: async () => "recalc",
      getPayrollAutomationHealth: async () => "health",
      generatePayrollRun: async () => "generate",
      approvePayrollRun: async () => "approve",
      payPayrollRun: async () => "pay",
    },
    executeRefreshDraftPayrollForLessonsSafe: async (payload) => {
      calls.push(payload);
      return { ok: true };
    },
  });

  const useCaseDeps = builders.buildPayrollUseCaseDeps();
  const result = await useCaseDeps.refreshDraftPayrollForLessonsSafe({ lessonIds: ["lesson_1"] });

  assert.equal(useCaseDeps.foo, "bar");
  assert.equal(useCaseDeps.generatePayrollRun, builders.buildPayrollUseCaseDeps().generatePayrollRun);
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls[0].lessonIds, ["lesson_1"]);
  assert.equal(typeof calls[0].refreshDraftPayrollForLesson, "function");
  assert.equal(calls[0].ApiError, useCaseDeps.ApiError);
});

test("diagnostics va query builders kerakli depslarni qaytaradi", () => {
  const builders = createPayrollDepsBuilders({
    coreDeps: {
      prisma: { id: "prisma" },
      ApiError: function ApiError() {},
      DECIMAL_ZERO: 0,
    },
    diagnosticsDeps: {
      money: "moneyFn",
      decimal: "decimalFn",
      ensureMainOrganization: "ensureOrg",
    },
    queryDeps: {
      ensureMainOrganization: "ensureOrg",
      buildCsv: "csvFn",
      toIsoOrEmpty: "isoFn",
    },
    serviceActions: {
      refreshDraftPayrollForLesson: async () => {},
      recalculatePayrollRunAggregates: async () => {},
      getPayrollAutomationHealth: async () => {},
      generatePayrollRun: async () => {},
      approvePayrollRun: async () => {},
      payPayrollRun: async () => {},
    },
    executeRefreshDraftPayrollForLessonsSafe: async () => {},
  });

  const diagnosticsDeps = builders.buildPayrollDiagnosticsDeps();
  const queryDeps = builders.buildPayrollQueryDeps();

  assert.equal(diagnosticsDeps.prisma.id, "prisma");
  assert.equal(diagnosticsDeps.ensureMainOrganization, "ensureOrg");
  assert.equal(queryDeps.buildCsv, "csvFn");
  assert.equal(queryDeps.toIsoOrEmpty, "isoFn");
});
