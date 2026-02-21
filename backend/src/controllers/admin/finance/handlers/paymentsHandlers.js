const orchestrator = require("../orchestrators/financeOrchestrator");

module.exports = {
  createStudentPayment: orchestrator.createStudentPayment,
  revertPayment: orchestrator.revertPayment,
};
