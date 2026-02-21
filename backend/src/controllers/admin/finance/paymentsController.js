const handlers = require("./handlers/paymentsHandlers");

module.exports = {
  createStudentPayment: handlers.createStudentPayment,
  revertPayment: handlers.revertPayment,
};
