require("dotenv").config();
const { env } = require("./config/env");
const app = require("./app");
const { applyAnnualPromotion } = require("./services/classroomPromotionService");
const { runAutoPayrollTick } = require("./services/payroll/payrollAutomationRunner");

const PORT = env.PORT;
const ENABLE_AUTO_CLASS_PROMOTION = env.ENABLE_AUTO_CLASS_PROMOTION;
const ENABLE_AUTO_PAYROLL = env.ENABLE_AUTO_PAYROLL;
const AUTO_PAYROLL_INTERVAL_MINUTES = env.AUTO_PAYROLL_INTERVAL_MINUTES;

async function runAutoClassroomPromotion() {
  try {
    const result = await applyAnnualPromotion({
      referenceDate: new Date(),
      mode: "auto",
      force: false,
      actorUserId: null,
    });
    if (!result.skipped) {
      console.log(
        `[AUTO_CLASS_PROMOTION] promoted=${result.applied.promoted} graduated=${result.applied.graduated} year=${result.plan.sourceAcademicYear}->${result.plan.targetAcademicYear}`,
      );
    } else {
      console.log(`[AUTO_CLASS_PROMOTION] skipped: ${result.reason}`);
    }
  } catch (error) {
    console.error("[AUTO_CLASS_PROMOTION] error:", error?.message || error);
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (ENABLE_AUTO_CLASS_PROMOTION) {
    runAutoClassroomPromotion();
    setInterval(runAutoClassroomPromotion, 12 * 60 * 60 * 1000);
  }
  if (ENABLE_AUTO_PAYROLL) {
    runAutoPayrollTick();
    setInterval(runAutoPayrollTick, AUTO_PAYROLL_INTERVAL_MINUTES * 60 * 1000);
  }
});
