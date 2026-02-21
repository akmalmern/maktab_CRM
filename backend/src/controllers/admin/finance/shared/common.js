const { ApiError } = require("../../../../utils/apiError");
const { formatMonthKey } = require("../../../../services/financeDebtService");

function parseIntSafe(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function startOfMonthUtc(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function nextMonthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function resolveTarifStartDate(_startType) {
  return nextMonthStart();
}

function safeFormatMonthKey(value) {
  try {
    return formatMonthKey(value);
  } catch {
    return value;
  }
}

function monthKeyToSerial(monthKey) {
  const [yearStr, monthStr] = String(monthKey || "").split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }
  return year * 12 + month;
}

function parseDebtTargetMonth(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const [yearStr, monthStr] = raw.split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new ApiError(
      400,
      "INVALID_MONTH",
      "debtTargetMonth formati noto'g'ri: YYYY-MM",
    );
  }
  return {
    key: raw,
    year,
    month,
    startDate: new Date(Date.UTC(year, month - 1, 1)),
  };
}

module.exports = {
  parseIntSafe,
  startOfMonthUtc,
  nextMonthStart,
  resolveTarifStartDate,
  safeFormatMonthKey,
  monthKeyToSerial,
  parseDebtTargetMonth,
};
