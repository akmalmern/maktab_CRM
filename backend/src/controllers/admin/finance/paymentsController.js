const handlers = require("./handlers/paymentsHandlers");

module.exports = {
  previewStudentPayment: handlers.previewStudentPayment,
  createStudentPayment: handlers.createStudentPayment,
  revertPayment: handlers.revertPayment,
};
