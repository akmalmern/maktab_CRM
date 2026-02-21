const orchestrator = require("../orchestrators/financeOrchestrator");

module.exports = {
  getOrCreateSettings: orchestrator.getOrCreateSettings,
  fetchFinancePageRows: orchestrator.fetchFinancePageRows,
  fetchAllFinanceRows: orchestrator.fetchAllFinanceRows,
};
