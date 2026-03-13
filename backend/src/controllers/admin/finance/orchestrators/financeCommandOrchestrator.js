const orchestrator = require("./financeOrchestrator");

module.exports = {
  upsertFinanceSettings: orchestrator.upsertFinanceSettings,
  rollbackFinanceTarif: orchestrator.rollbackFinanceTarif,
  createStudentPayment: orchestrator.createStudentPayment,
  createStudentImtiyoz: orchestrator.createStudentImtiyoz,
  deactivateStudentImtiyoz: orchestrator.deactivateStudentImtiyoz,
  revertPayment: orchestrator.revertPayment,
  partialRevertPayment: orchestrator.partialRevertPayment,
};
