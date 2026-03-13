const financeQueryOrchestrator = require("../orchestrators/financeQueryOrchestrator");

module.exports = {
  getOrCreateSettings: financeQueryOrchestrator.getOrCreateSettings,
  fetchFinancePageRows: financeQueryOrchestrator.fetchFinancePageRows,
  processFinanceRowsInBatches: financeQueryOrchestrator.processFinanceRowsInBatches,
  fetchAllFinanceRows: financeQueryOrchestrator.fetchAllFinanceRows,
};
