const { env } = require("../config/env");
const {
  tryAcquireDistributedLock,
  releaseDistributedLock,
} = require("./automationLockService");
const { utcDateToTashkentIsoDate } = require("../utils/tashkentTime");
const { checkAndActivateTariffs } = require("./financeSettingsService");
const {
  syncAllActiveStudentsMajburiyatByMainSettings,
} = require("./financeMajburiyatService");
const { logger } = require("../utils/logger");

let running = false;
let lastMonthlySyncMonthKey = null;
const financeAutomationLogger = logger.child({ component: "finance_automation" });

function getTashkentDateParts(date = new Date()) {
  const iso = String(utcDateToTashkentIsoDate(date) || "");
  const [yearRaw, monthRaw, dayRaw] = iso.split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  const day = Number.parseInt(dayRaw, 10);
  return {
    year,
    month,
    day,
    monthKey: Number.isFinite(year) && Number.isFinite(month)
      ? `${year}-${String(month).padStart(2, "0")}`
      : null,
  };
}

async function runMonthlyDebtSync({
  futureMonths = env.AUTO_FINANCE_SYNC_FUTURE_MONTHS,
} = {}) {
  return syncAllActiveStudentsMajburiyatByMainSettings({
    futureMonths,
  });
}

async function runAutoFinanceTick({ forceMonthlySync = false } = {}) {
  if (running) {
    financeAutomationLogger.info("auto_finance_skipped", {
      reason: "already_running",
    });
    return;
  }
  const lockKey = "auto_finance_tick";
  const lockAcquired = await tryAcquireDistributedLock({ key: lockKey });
  if (!lockAcquired) {
    financeAutomationLogger.info("auto_finance_skipped", {
      reason: "distributed_lock_held",
      lockKey,
    });
    return;
  }
  running = true;
  try {
    const activation = await checkAndActivateTariffs();
    const parts = getTashkentDateParts(new Date());
    const shouldRunMonthlySync = Boolean(
      forceMonthlySync ||
        (parts.day === 1 && parts.monthKey && parts.monthKey !== lastMonthlySyncMonthKey),
    );

    let monthlySyncResult = null;
    if (shouldRunMonthlySync) {
      monthlySyncResult = await runMonthlyDebtSync({
        futureMonths: env.AUTO_FINANCE_SYNC_FUTURE_MONTHS,
      });
      lastMonthlySyncMonthKey = parts.monthKey;
    }

    financeAutomationLogger.info("auto_finance_completed", {
      tariffActivated: Boolean(activation.activated),
      monthlySync: monthlySyncResult ? "done" : "skip",
      syncedStudents: Number(monthlySyncResult?.syncedStudents || 0),
      monthKey: parts.monthKey,
    });
  } catch (error) {
    financeAutomationLogger.error("auto_finance_failed", {
      error,
    });
  } finally {
    running = false;
    await releaseDistributedLock({ key: lockKey });
  }
}

module.exports = {
  runMonthlyDebtSync,
  runAutoFinanceTick,
};
