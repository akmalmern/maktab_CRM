const orchestrator = require("../orchestrators/financeOrchestrator");

module.exports = {
  getFinanceStudents: orchestrator.getFinanceStudents,
  getStudentFinanceDetail: orchestrator.getStudentFinanceDetail,
};
