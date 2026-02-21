const handlers = require("./handlers/studentsHandlers");

module.exports = {
  getFinanceStudents: handlers.getFinanceStudents,
  getStudentFinanceDetail: handlers.getStudentFinanceDetail,
};
