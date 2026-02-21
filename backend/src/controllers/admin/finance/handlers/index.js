const settingsHandlers = require("./settingsHandlers");
const studentsHandlers = require("./studentsHandlers");
const paymentsHandlers = require("./paymentsHandlers");
const discountsHandlers = require("./discountsHandlers");
const exportHandlers = require("./exportHandlers");

module.exports = {
  ...settingsHandlers,
  ...studentsHandlers,
  ...paymentsHandlers,
  ...discountsHandlers,
  ...exportHandlers,
};
