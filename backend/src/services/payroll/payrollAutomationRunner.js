const { ApiError } = require("../../utils/apiError");
const { env } = require("../../config/env");
const payrollService = require("./payrollService");

let running = false;

async function runAutoPayrollTick() {
  if (running) {
    console.log("[AUTO_PAYROLL] skipped: previous tick still running");
    return;
  }
  running = true;
  try {
    const result = await payrollService.runPayrollAutomation({
      body: {
        generate: true,
        autoApprove: env.AUTO_PAYROLL_AUTO_APPROVE,
        autoPay: env.AUTO_PAYROLL_AUTO_PAY,
        paymentMethod: env.AUTO_PAYROLL_PAYMENT_METHOD,
      },
      actorUserId: null,
      req: null,
    });

    const completedSteps = (result.steps || [])
      .filter((step) => step.status === "DONE")
      .map((step) => step.step)
      .join(",");

    console.log(
      `[AUTO_PAYROLL] period=${result.periodMonth} completedSteps=${completedSteps || "none"} blockers=${result.healthAfter?.summary?.blockerCount || 0}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === "PAYROLL_AUTOMATION_BLOCKED") {
      const blockerCount = Number(error.details?.health?.summary?.blockerCount || 0);
      console.warn(`[AUTO_PAYROLL] blocked: blockers=${blockerCount}`);
      return;
    }
    console.error("[AUTO_PAYROLL] error:", error?.message || error);
  } finally {
    running = false;
  }
}

module.exports = {
  runAutoPayrollTick,
};
