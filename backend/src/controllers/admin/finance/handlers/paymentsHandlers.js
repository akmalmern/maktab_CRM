const queryHandlers = require("./queryHandlers");
const commandHandlers = require("./commandHandlers");

module.exports = {
  previewStudentPayment: queryHandlers.previewStudentPayment,
  createStudentPayment: commandHandlers.createStudentPayment,
  revertPayment: commandHandlers.revertPayment,
  partialRevertPayment: commandHandlers.partialRevertPayment,
};
