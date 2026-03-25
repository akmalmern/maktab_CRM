require("dotenv").config();
const { env } = require("./config/env");
const app = require("./app");
const { logger } = require("./utils/logger");
const { applyAnnualPromotion } = require("./modules/classrooms");
const { runAutoPayrollTick } = require("./services/payroll/payrollAutomationRunner");
const { runAutoFinanceTick } = require("./services/financeAutomationRunner");
const { runRefreshSessionCleanupTick } = require("./services/refreshSessionCleanupService");

const PORT = env.PORT;
const ENABLE_AUTO_CLASS_PROMOTION = env.ENABLE_AUTO_CLASS_PROMOTION;
const ENABLE_AUTO_PAYROLL = env.ENABLE_AUTO_PAYROLL;
const AUTO_PAYROLL_INTERVAL_MINUTES = env.AUTO_PAYROLL_INTERVAL_MINUTES;
const ENABLE_AUTO_FINANCE = env.ENABLE_AUTO_FINANCE;
const AUTO_FINANCE_INTERVAL_MINUTES = env.AUTO_FINANCE_INTERVAL_MINUTES;
const ENABLE_REFRESH_SESSION_CLEANUP = env.ENABLE_REFRESH_SESSION_CLEANUP;
const REFRESH_SESSION_CLEANUP_INTERVAL_MINUTES = env.REFRESH_SESSION_CLEANUP_INTERVAL_MINUTES;
const serverLogger = logger.child({ component: "server" });

async function runAutoClassroomPromotion() {
  try {
    const result = await applyAnnualPromotion({
      referenceDate: new Date(),
      mode: "auto",
      force: false,
      actorUserId: null,
    });
    if (!result.skipped) {
      serverLogger.info("auto_class_promotion_completed", {
        promoted: result.applied.promoted,
        graduated: result.applied.graduated,
        sourceAcademicYear: result.plan.sourceAcademicYear,
        targetAcademicYear: result.plan.targetAcademicYear,
      });
    } else {
      serverLogger.info("auto_class_promotion_skipped", {
        reason: result.reason,
      });
    }
  } catch (error) {
    serverLogger.error("auto_class_promotion_failed", {
      error,
    });
  }
}

app.listen(PORT, () => {
  serverLogger.info("server_started", {
    port: PORT,
    enableAutoClassPromotion: ENABLE_AUTO_CLASS_PROMOTION,
    enableAutoPayroll: ENABLE_AUTO_PAYROLL,
    enableAutoFinance: ENABLE_AUTO_FINANCE,
    enableRefreshSessionCleanup: ENABLE_REFRESH_SESSION_CLEANUP,
  });
  if (ENABLE_AUTO_CLASS_PROMOTION) {
    runAutoClassroomPromotion();
    setInterval(runAutoClassroomPromotion, 12 * 60 * 60 * 1000);
  }
  if (ENABLE_AUTO_PAYROLL) {
    runAutoPayrollTick();
    setInterval(runAutoPayrollTick, AUTO_PAYROLL_INTERVAL_MINUTES * 60 * 1000);
  }
  if (ENABLE_AUTO_FINANCE) {
    runAutoFinanceTick();
    setInterval(runAutoFinanceTick, AUTO_FINANCE_INTERVAL_MINUTES * 60 * 1000);
  }
  if (ENABLE_REFRESH_SESSION_CLEANUP) {
    runRefreshSessionCleanupTick();
    setInterval(
      runRefreshSessionCleanupTick,
      REFRESH_SESSION_CLEANUP_INTERVAL_MINUTES * 60 * 1000,
    );
  }
});
