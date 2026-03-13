const queryHandlers = require("./queryHandlers");
const commandHandlers = require("./commandHandlers");

module.exports = {
  ...queryHandlers,
  ...commandHandlers,
};
