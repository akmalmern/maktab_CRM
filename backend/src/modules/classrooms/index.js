const { registerAdminClassroomRoutes } = require("./routes");
const annualPromotionService = require("./annualPromotionService");

module.exports = {
  registerAdminClassroomRoutes,
  ...annualPromotionService,
};
