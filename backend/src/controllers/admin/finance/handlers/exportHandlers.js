const queryHandlers = require("./queryHandlers");

module.exports = {
  exportDebtorsXlsx: queryHandlers.exportDebtorsXlsx,
  exportDebtorsPdf: queryHandlers.exportDebtorsPdf,
};
