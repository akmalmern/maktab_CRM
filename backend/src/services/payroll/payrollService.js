const prisma = require("../../prisma");
const { Prisma } = require("@prisma/client");
const { ApiError } = require("../../utils/apiError");
const { utcDateToTashkentIsoDate } = require("../../utils/tashkentTime");
const {
  monthKeyFromDateValue,
  monthKeyToUtcRange,
  computeDurationMinutes,
  normalizeRequestedPeriodMonth,
  parseBooleanFlag,
} = require("./shared/payrollPeriodUtils");
const {
  executeRefreshDraftPayrollForLessonsSafe,
} = require("./shared/payrollRefreshOrchestrator");
const { createPayrollScalarUtils } = require("./shared/payrollScalarUtils");
const { createPayrollInfrastructure } = require("./shared/payrollInfrastructure");
const { createPayrollDepsBuilders } = require("./shared/payrollDepsBuilders");
const { createPayrollRunRepoAdapters } = require("./shared/payrollRunRepoAdapters");
const { buildCsv, toIsoOrEmpty } = require("./shared/payrollQueryFormatters");
const { createPayrollStateDomain } = require("./shared/payrollStateDomain");
const { createPayrollAssertions } = require("./shared/payrollAssertions");
const { createPayrollItemDomain } = require("./shared/payrollItemDomain");
const { createPayrollLessonRateDomain } = require("./shared/payrollLessonRateDomain");
const {
  executeRecalculatePayrollRunAggregates,
} = require("./useCases/recalculatePayrollRunAggregates");
const { executeApprovePayrollRun } = require("./useCases/approvePayrollRun");
const { executePayPayrollRun } = require("./useCases/payPayrollRun");
const { executePayPayrollItem } = require("./useCases/payPayrollItem");
const { executeReversePayrollRun } = require("./useCases/reversePayrollRun");
const { executeRunPayrollAutomation } = require("./useCases/runPayrollAutomation");
const { executeGeneratePayrollRun } = require("./useCases/generatePayrollRun");
const {
  executeGetPayrollAutomationHealth,
  executeGetPayrollMonthlyReport,
} = require("./useCases/queryPayrollDiagnostics");
const {
  executeRefreshDraftPayrollForLesson,
} = require("./useCases/refreshDraftPayrollForLesson");
const {
  executeListPayrollEmployees,
  executeUpdatePayrollEmployeeConfig,
} = require("./useCases/managePayrollEmployees");
const {
  executeAddPayrollAdjustment,
  executeDeletePayrollAdjustment,
} = require("./useCases/managePayrollAdjustments");
const {
  executeListTeacherRates,
  executeCreateTeacherRate,
  executeUpdateTeacherRate,
  executeDeleteTeacherRate,
  executeListSubjectDefaultRates,
  executeCreateSubjectDefaultRate,
  executeUpdateSubjectDefaultRate,
  executeDeleteSubjectDefaultRate,
} = require("./useCases/managePayrollRates");
const {
  executeListRealLessons,
  executeCreateRealLesson,
  executeUpdateRealLessonStatus,
  executeBulkUpdateRealLessonStatus,
} = require("./useCases/manageRealLessons");
const {
  executeListAdvancePayments,
  executeCreateAdvancePayment,
  executeDeleteAdvancePayment,
} = require("./useCases/manageAdvancePayments");
const {
  executeListPayrollRuns,
  executeGetPayrollRunDetail,
  executeExportPayrollRunCsv,
  executeExportPayrollRunExcel,
  executeGetTeacherPayslipsByUserId,
  executeGetTeacherPayslipDetailByUserId,
} = require("./useCases/queryPayroll");
const {
  getActiveRunForPeriod: getActiveRunForPeriodRepo,
  lockPayrollPeriodScope: lockPayrollPeriodScopeRepo,
  getPayrollRunOrThrow: getPayrollRunOrThrowRepo,
  lockPayrollRunRow: lockPayrollRunRowRepo,
  lockPayrollItemRow: lockPayrollItemRowRepo,
} = require("./repositories/payrollRunRepository");

const MAIN_ORG_KEY = "MAIN";
const MAIN_ORG_NAME = "Asosiy tashkilot";
const ACTIVE_PAYROLL_STATUSES = ["DRAFT", "APPROVED", "PAID"];
const DECIMAL_ZERO = new Prisma.Decimal(0);
const MANUAL_ADJUSTMENT_TYPES = new Set(["BONUS", "PENALTY", "MANUAL"]);
const REGENERATE_LINE_TYPES = ["LESSON", "FIXED_SALARY", "ADVANCE_DEDUCTION"];

const { cleanOptional, decimal, money } = createPayrollScalarUtils({
  Prisma,
  DECIMAL_ZERO,
});

const {
  clampPaidAmountToPayable,
  getPayrollItemPaymentStatus,
  assertRunStatus,
} = createPayrollStateDomain({
  ApiError,
  money,
  DECIMAL_ZERO,
});

const {
  getActiveRunForPeriod,
  lockPayrollPeriodScope,
  getPayrollRunOrThrow,
  lockPayrollRunRow,
  lockPayrollItemRow,
} = createPayrollRunRepoAdapters({
  getActiveRunForPeriodRepo,
  lockPayrollPeriodScopeRepo,
  getPayrollRunOrThrowRepo,
  lockPayrollRunRowRepo,
  lockPayrollItemRowRepo,
  activeStatuses: ACTIVE_PAYROLL_STATUSES,
  ApiError,
});

const {
  ensureMainOrganization,
  resolvePayrollRunActorUserId,
  createAuditLog,
  createPayrollCashEntry,
  mapPayrollEmployeeConfigRow,
} = createPayrollInfrastructure({
  ApiError,
  cleanOptional,
  mainOrgKey: MAIN_ORG_KEY,
  mainOrgName: MAIN_ORG_NAME,
});

const {
  assertNoTeacherRateOverlap,
  assertNoSubjectDefaultRateOverlap,
  assertTeacherExists,
  assertEmployeeExists,
  ensureEmployeeForTeacher,
  assertSubjectExists,
  assertClassroomExists,
  assertDarsJadvaliExists,
} = createPayrollAssertions({ ApiError });

const { getOrCreatePayrollItem, buildItemSummaryFromLines } = createPayrollItemDomain({
  ApiError,
  Prisma,
  decimal,
  money,
  DECIMAL_ZERO,
});

const {
  isEmployeeLessonPayrollEligible,
  loadRatesForPeriod,
  resolveRateForLesson,
  calcLessonAmount,
  resolvePayrollTeacherIdForLesson,
} = createPayrollLessonRateDomain({
  ApiError,
  decimal,
  money,
});


async function listRealLessons({ query }) {
  return executeListRealLessons({
    deps: buildPayrollUseCaseDeps(),
    query,
  });
}

async function createRealLesson({ body, actorUserId, req }) {
  return executeCreateRealLesson({
    deps: buildPayrollUseCaseDeps(),
    body,
    actorUserId,
    req,
  });
}

async function updateRealLessonStatus({ lessonId, body, actorUserId, req }) {
  return executeUpdateRealLessonStatus({
    deps: buildPayrollUseCaseDeps(),
    lessonId,
    body,
    actorUserId,
    req,
  });
}

async function bulkUpdateRealLessonStatus({ body, actorUserId, req }) {
  return executeBulkUpdateRealLessonStatus({
    deps: buildPayrollUseCaseDeps(),
    body,
    actorUserId,
    req,
  });
}

async function listTeacherRates({ query }) {
  return executeListTeacherRates({
    deps: buildPayrollUseCaseDeps(),
    query,
  });
}

async function listPayrollEmployees({ query }) {
  return executeListPayrollEmployees({
    deps: buildPayrollUseCaseDeps(),
    query,
  });
}

async function updatePayrollEmployeeConfig({ employeeId, body, actorUserId, req }) {
  return executeUpdatePayrollEmployeeConfig({
    deps: buildPayrollUseCaseDeps(),
    employeeId,
    body,
    actorUserId,
    req,
  });
}

async function createTeacherRate({ body, actorUserId, req }) {
  return executeCreateTeacherRate({
    deps: buildPayrollUseCaseDeps(),
    body,
    actorUserId,
    req,
  });
}

async function updateTeacherRate({ rateId, body, actorUserId, req }) {
  return executeUpdateTeacherRate({
    deps: buildPayrollUseCaseDeps(),
    rateId,
    body,
    actorUserId,
    req,
  });
}

async function deleteTeacherRate({ rateId, actorUserId, req }) {
  return executeDeleteTeacherRate({
    deps: buildPayrollUseCaseDeps(),
    rateId,
    actorUserId,
    req,
  });
}

async function listSubjectDefaultRates({ query }) {
  return executeListSubjectDefaultRates({
    deps: buildPayrollUseCaseDeps(),
    query,
  });
}

async function createSubjectDefaultRate({ body, actorUserId, req }) {
  return executeCreateSubjectDefaultRate({
    deps: buildPayrollUseCaseDeps(),
    body,
    actorUserId,
    req,
  });
}

async function updateSubjectDefaultRate({ rateId, body, actorUserId, req }) {
  return executeUpdateSubjectDefaultRate({
    deps: buildPayrollUseCaseDeps(),
    rateId,
    body,
    actorUserId,
    req,
  });
}

async function deleteSubjectDefaultRate({ rateId, actorUserId, req }) {
  return executeDeleteSubjectDefaultRate({
    deps: buildPayrollUseCaseDeps(),
    rateId,
    actorUserId,
    req,
  });
}

async function listAdvancePayments({ query }) {
  return executeListAdvancePayments({
    deps: buildPayrollUseCaseDeps(),
    query,
  });
}

async function createAdvancePayment({ body, actorUserId, req }) {
  return executeCreateAdvancePayment({
    deps: buildPayrollUseCaseDeps(),
    body,
    actorUserId,
    req,
  });
}

async function deleteAdvancePayment({ advanceId, actorUserId, req }) {
  return executeDeleteAdvancePayment({
    deps: buildPayrollUseCaseDeps(),
    advanceId,
    actorUserId,
    req,
  });
}

async function recalculatePayrollRunAggregates(tx, { payrollRunId, payrollItemId = null }) {
  return executeRecalculatePayrollRunAggregates({
    deps: buildPayrollUseCaseDeps(),
    tx,
    payrollRunId,
    payrollItemId,
  });
}

async function refreshDraftPayrollForLesson({ lessonId, actorUserId, req }) {
  return executeRefreshDraftPayrollForLesson({
    deps: buildPayrollUseCaseDeps(),
    lessonId,
    actorUserId,
    req,
  });
}

async function generatePayrollRun({ body, actorUserId, req }) {
  return executeGeneratePayrollRun({
    deps: buildPayrollUseCaseDeps(),
    body,
    actorUserId,
    req,
  });
}

async function listPayrollRuns({ query }) {
  return executeListPayrollRuns({
    deps: buildPayrollQueryDeps(),
    query,
  });
}

async function getPayrollRunDetail({ runId, query }) {
  return executeGetPayrollRunDetail({
    deps: buildPayrollQueryDeps(),
    runId,
    query,
  });
}

async function exportPayrollRunCsv({ runId, query }) {
  return executeExportPayrollRunCsv({
    deps: buildPayrollQueryDeps(),
    runId,
    query,
  });
}

async function exportPayrollRunExcel({ runId, query }) {
  return executeExportPayrollRunExcel({
    deps: buildPayrollQueryDeps(),
    runId,
    query,
  });
}

async function addPayrollAdjustment({ runId, body, actorUserId, req }) {
  return executeAddPayrollAdjustment({
    deps: buildPayrollUseCaseDeps(),
    runId,
    body,
    actorUserId,
    req,
  });
}

async function deletePayrollAdjustment({ runId, lineId, actorUserId, req }) {
  return executeDeletePayrollAdjustment({
    deps: buildPayrollUseCaseDeps(),
    runId,
    lineId,
    actorUserId,
    req,
  });
}

async function approvePayrollRun({ runId, actorUserId, req }) {
  return executeApprovePayrollRun({
    deps: buildPayrollUseCaseDeps(),
    runId,
    actorUserId,
    req,
  });
}

async function payPayrollRun({ runId, body, actorUserId, req }) {
  return executePayPayrollRun({
    deps: buildPayrollUseCaseDeps(),
    runId,
    body,
    actorUserId,
    req,
  });
}

async function payPayrollItem({ runId, itemId, body, actorUserId, req }) {
  return executePayPayrollItem({
    deps: buildPayrollUseCaseDeps(),
    runId,
    itemId,
    body,
    actorUserId,
    req,
  });
}

async function reversePayrollRun({ runId, body, actorUserId, req }) {
  return executeReversePayrollRun({
    deps: buildPayrollUseCaseDeps(),
    runId,
    body,
    actorUserId,
    req,
  });
}

async function getPayrollAutomationHealth({ query }) {
  const periodMonth = normalizeRequestedPeriodMonth(query.periodMonth);
  const includeDetails = parseBooleanFlag(query.includeDetails, true);
  return executeGetPayrollAutomationHealth({
    deps: buildPayrollDiagnosticsDeps(),
    periodMonth,
    includeDetails,
  });
}

async function getPayrollMonthlyReport({ query }) {
  const periodMonth = normalizeRequestedPeriodMonth(query.periodMonth);
  const includeDetails = parseBooleanFlag(query.includeDetails, true);
  return executeGetPayrollMonthlyReport({
    deps: buildPayrollDiagnosticsDeps(),
    periodMonth,
    includeDetails,
  });
}

async function runPayrollAutomation({ body, actorUserId, req }) {
  return executeRunPayrollAutomation({
    deps: buildPayrollUseCaseDeps(),
    body,
    actorUserId,
    req,
  });
}

async function getTeacherPayslipsByUserId({ userId, query }) {
  return executeGetTeacherPayslipsByUserId({
    deps: buildPayrollQueryDeps(),
    userId,
    query,
  });
}

async function getTeacherPayslipDetailByUserId({ userId, runId, query }) {
  return executeGetTeacherPayslipDetailByUserId({
    deps: buildPayrollQueryDeps(),
    userId,
    runId,
    query,
  });
}

const { buildPayrollUseCaseDeps, buildPayrollDiagnosticsDeps, buildPayrollQueryDeps } =
  createPayrollDepsBuilders({
    coreDeps: {
      prisma,
      ApiError,
      DECIMAL_ZERO,
      MANUAL_ADJUSTMENT_TYPES,
      REGENERATE_LINE_TYPES,
      money,
      decimal,
      cleanOptional,
      monthKeyFromDateValue,
      buildItemSummaryFromLines,
      clampPaidAmountToPayable,
      getPayrollItemPaymentStatus,
      ensureMainOrganization,
      resolvePayrollRunActorUserId,
      getActiveRunForPeriod,
      lockPayrollPeriodScope,
      getPayrollRunOrThrow,
      lockPayrollRunRow,
      lockPayrollItemRow,
      assertRunStatus,
      assertTeacherExists,
      assertSubjectExists,
      assertClassroomExists,
      assertDarsJadvaliExists,
      assertEmployeeExists,
      ensureEmployeeForTeacher,
      assertNoTeacherRateOverlap,
      assertNoSubjectDefaultRateOverlap,
      computeDurationMinutes,
      monthKeyToUtcRange,
      utcDateToTashkentIsoDate,
      loadRatesForPeriod,
      isEmployeeLessonPayrollEligible,
      resolvePayrollTeacherIdForLesson,
      resolveRateForLesson,
      calcLessonAmount,
      getOrCreatePayrollItem,
      createAuditLog,
      createPayrollCashEntry,
      mapPayrollEmployeeConfigRow,
      normalizeRequestedPeriodMonth,
    },
    diagnosticsDeps: {
      money,
      decimal,
      ensureMainOrganization,
      getActiveRunForPeriod,
      monthKeyToUtcRange,
      loadRatesForPeriod,
      isEmployeeLessonPayrollEligible,
      resolvePayrollTeacherIdForLesson,
      resolveRateForLesson,
    },
    queryDeps: {
      ensureMainOrganization,
      money,
      decimal,
      buildCsv,
      toIsoOrEmpty,
    },
    serviceActions: {
      refreshDraftPayrollForLesson,
      recalculatePayrollRunAggregates,
      getPayrollAutomationHealth,
      generatePayrollRun,
      approvePayrollRun,
      payPayrollRun,
    },
    executeRefreshDraftPayrollForLessonsSafe,
  });

module.exports = {
  listRealLessons,
  createRealLesson,
  updateRealLessonStatus,
  bulkUpdateRealLessonStatus,
  listPayrollEmployees,
  updatePayrollEmployeeConfig,
  listTeacherRates,
  createTeacherRate,
  updateTeacherRate,
  deleteTeacherRate,
  listSubjectDefaultRates,
  createSubjectDefaultRate,
  updateSubjectDefaultRate,
  deleteSubjectDefaultRate,
  listAdvancePayments,
  createAdvancePayment,
  deleteAdvancePayment,
  refreshDraftPayrollForLesson,
  generatePayrollRun,
  listPayrollRuns,
  getPayrollRunDetail,
  exportPayrollRunCsv,
  exportPayrollRunExcel,
  addPayrollAdjustment,
  deletePayrollAdjustment,
  approvePayrollRun,
  payPayrollRun,
  payPayrollItem,
  reversePayrollRun,
  getPayrollAutomationHealth,
  runPayrollAutomation,
  getPayrollMonthlyReport,
  getTeacherPayslipsByUserId,
  getTeacherPayslipDetailByUserId,
  __private: {
    isEmployeeLessonPayrollEligible,
    buildItemSummaryFromLines,
  },
};
