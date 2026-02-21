const orchestrator = require("../orchestrators/financeOrchestrator");

module.exports = {
  exportDebtorsXlsx: orchestrator.exportDebtorsXlsx,
  exportDebtorsPdf: orchestrator.exportDebtorsPdf,
};
