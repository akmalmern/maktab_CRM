const financeCommandOrchestrator = require("../orchestrators/financeCommandOrchestrator");

module.exports = {
  upsertFinanceSettings: financeCommandOrchestrator.upsertFinanceSettings,
  rollbackFinanceTarif: financeCommandOrchestrator.rollbackFinanceTarif,
  createStudentPayment: financeCommandOrchestrator.createStudentPayment,
  createStudentImtiyoz: financeCommandOrchestrator.createStudentImtiyoz,
  deactivateStudentImtiyoz: financeCommandOrchestrator.deactivateStudentImtiyoz,
  revertPayment: financeCommandOrchestrator.revertPayment,
  partialRevertPayment: financeCommandOrchestrator.partialRevertPayment,
};
