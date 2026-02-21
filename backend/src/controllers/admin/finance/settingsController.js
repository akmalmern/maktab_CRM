const handlers = require("./handlers/settingsHandlers");

module.exports = {
  getFinanceSettings: handlers.getFinanceSettings,
  upsertFinanceSettings: handlers.upsertFinanceSettings,
  rollbackFinanceTarif: handlers.rollbackFinanceTarif,
};
