const handlers = require("./handlers/exportHandlers");

module.exports = {
  exportDebtorsXlsx: handlers.exportDebtorsXlsx,
  exportDebtorsPdf: handlers.exportDebtorsPdf,
};
