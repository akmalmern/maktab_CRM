const { ApiError } = require("../../utils/apiError");
const { env } = require("../../config/env");
const {
  tryAcquireDistributedLock,
  releaseDistributedLock,
} = require("../automationLockService");
const { logger } = require("../../utils/logger");
const payrollService = require("./payrollService");

let running = false;
const payrollAutomationLogger = logger.child({ component: "payroll_automation" });

async function runAutoPayrollTick() {
  if (running) {
    payrollAutomationLogger.info("auto_payroll_skipped", {
      reason: "already_running",
    });
    return;
  }
  const lockKey = "auto_payroll_tick";
  const lockAcquired = await tryAcquireDistributedLock({ key: lockKey });
  if (!lockAcquired) {
    payrollAutomationLogger.info("auto_payroll_skipped", {
      reason: "distributed_lock_held",
      lockKey,
    });
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

    payrollAutomationLogger.info("auto_payroll_completed", {
      periodMonth: result.periodMonth,
      completedSteps: completedSteps || "none",
      blockerCount: Number(result.healthAfter?.summary?.blockerCount || 0),
    });
  } catch (error) {
    if (error instanceof ApiError && error.code === "PAYROLL_AUTOMATION_BLOCKED") {
      const blockerCount = Number(error.details?.health?.summary?.blockerCount || 0);
      payrollAutomationLogger.warn("auto_payroll_blocked", {
        blockerCount,
      });
      return;
    }
    payrollAutomationLogger.error("auto_payroll_failed", {
      error,
    });
  } finally {
    running = false;
    await releaseDistributedLock({ key: lockKey });
  }
}

module.exports = {
  runAutoPayrollTick,
};
