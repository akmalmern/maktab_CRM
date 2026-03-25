function createPayrollRunRepoAdapters({
  getActiveRunForPeriodRepo,
  lockPayrollPeriodScopeRepo,
  getPayrollRunOrThrowRepo,
  lockPayrollRunRowRepo,
  lockPayrollItemRowRepo,
  activeStatuses,
  ApiError,
}) {
  async function getActiveRunForPeriod(tx, { organizationId, periodMonth }) {
    return getActiveRunForPeriodRepo(tx, {
      organizationId,
      periodMonth,
      activeStatuses,
      ApiError,
    });
  }

  async function lockPayrollPeriodScope(tx, { organizationId, periodMonth }) {
    return lockPayrollPeriodScopeRepo(tx, { organizationId, periodMonth });
  }

  async function getPayrollRunOrThrow(tx, { runId, organizationId }) {
    return getPayrollRunOrThrowRepo(tx, { runId, organizationId, ApiError });
  }

  async function lockPayrollRunRow(tx, { runId, organizationId }) {
    return lockPayrollRunRowRepo(tx, { runId, organizationId });
  }

  async function lockPayrollItemRow(tx, { itemId, runId, organizationId }) {
    return lockPayrollItemRowRepo(tx, { itemId, runId, organizationId });
  }

  return {
    getActiveRunForPeriod,
    lockPayrollPeriodScope,
    getPayrollRunOrThrow,
    lockPayrollRunRow,
    lockPayrollItemRow,
  };
}

module.exports = {
  createPayrollRunRepoAdapters,
};
