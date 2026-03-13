const queryHandlers = require("./queryHandlers");
const commandHandlers = require("./commandHandlers");

module.exports = {
  getFinanceSettings: queryHandlers.getFinanceSettings,
  upsertFinanceSettings: commandHandlers.upsertFinanceSettings,
  rollbackFinanceTarif: commandHandlers.rollbackFinanceTarif,
};
