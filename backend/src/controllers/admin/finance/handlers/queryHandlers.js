const financeQueryOrchestrator = require("../orchestrators/financeQueryOrchestrator");

module.exports = {
  getFinanceSettings: financeQueryOrchestrator.getFinanceSettings,
  getFinanceStudents: financeQueryOrchestrator.getFinanceStudents,
  getStudentFinanceDetail: financeQueryOrchestrator.getStudentFinanceDetail,
  previewStudentPayment: financeQueryOrchestrator.previewStudentPayment,
  exportDebtorsXlsx: financeQueryOrchestrator.exportDebtorsXlsx,
  exportDebtorsPdf: financeQueryOrchestrator.exportDebtorsPdf,
};
