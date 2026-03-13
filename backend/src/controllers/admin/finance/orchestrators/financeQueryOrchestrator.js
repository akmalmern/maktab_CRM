const orchestrator = require("./financeOrchestrator");

module.exports = {
  getOrCreateSettings: orchestrator.getOrCreateSettings,
  fetchFinancePageRows: orchestrator.fetchFinancePageRows,
  processFinanceRowsInBatches: orchestrator.processFinanceRowsInBatches,
  fetchAllFinanceRows: orchestrator.fetchAllFinanceRows,
  fetchFinanceSummary: orchestrator.fetchFinanceSummary,
  buildFinanceSettingsPayload: orchestrator.buildFinanceSettingsPayload,
  getFinanceSettings: orchestrator.getFinanceSettings,
  getFinanceStudents: orchestrator.getFinanceStudents,
  getStudentFinanceDetail: orchestrator.getStudentFinanceDetail,
  previewStudentPayment: orchestrator.previewStudentPayment,
  exportDebtorsXlsx: orchestrator.exportDebtorsXlsx,
  exportDebtorsPdf: orchestrator.exportDebtorsPdf,
};
