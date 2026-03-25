function createPayrollDepsBuilders({
  coreDeps,
  diagnosticsDeps,
  queryDeps,
  serviceActions,
  executeRefreshDraftPayrollForLessonsSafe,
}) {
  function buildPayrollUseCaseDeps() {
    return {
      ...coreDeps,
      refreshDraftPayrollForLessonsSafe: (args) =>
        executeRefreshDraftPayrollForLessonsSafe({
          ...args,
          refreshDraftPayrollForLesson: serviceActions.refreshDraftPayrollForLesson,
          ApiError: coreDeps.ApiError,
        }),
      recalculatePayrollRunAggregates: serviceActions.recalculatePayrollRunAggregates,
      getPayrollAutomationHealth: serviceActions.getPayrollAutomationHealth,
      generatePayrollRun: serviceActions.generatePayrollRun,
      approvePayrollRun: serviceActions.approvePayrollRun,
      payPayrollRun: serviceActions.payPayrollRun,
    };
  }

  function buildPayrollDiagnosticsDeps() {
    return {
      prisma: coreDeps.prisma,
      ApiError: coreDeps.ApiError,
      DECIMAL_ZERO: coreDeps.DECIMAL_ZERO,
      ...diagnosticsDeps,
    };
  }

  function buildPayrollQueryDeps() {
    return {
      prisma: coreDeps.prisma,
      ApiError: coreDeps.ApiError,
      ...queryDeps,
    };
  }

  return {
    buildPayrollUseCaseDeps,
    buildPayrollDiagnosticsDeps,
    buildPayrollQueryDeps,
  };
}

module.exports = {
  createPayrollDepsBuilders,
};
