const { ApiError } = require("../../../utils/apiError");
const {
  localDayStartUtc,
  utcDateToTashkentIsoDate,
} = require("../../../utils/tashkentTime");

function cleanOptionalString(value) {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  return normalized || undefined;
}

function monthKeyFromDateValue(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "INVALID_DATE", "Sana noto'g'ri");
  }
  return utcDateToTashkentIsoDate(date).slice(0, 7);
}

function monthKeyToUtcRange(periodMonth) {
  const value = String(periodMonth || "").trim();
  const match = value.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) {
    throw new ApiError(400, "INVALID_PERIOD_MONTH", "periodMonth formati YYYY-MM bo'lishi kerak");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const startIso = `${year}-${String(month).padStart(2, "0")}-01`;
  const endIso = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return {
    periodMonth: value,
    periodStart: localDayStartUtc(startIso),
    periodEnd: localDayStartUtc(endIso),
  };
}

function computeDurationMinutes(startAt, endAt, providedDuration) {
  if (Number.isFinite(Number(providedDuration)) && Number(providedDuration) > 0) {
    return Math.trunc(Number(providedDuration));
  }
  const diffMs = new Date(endAt).getTime() - new Date(startAt).getTime();
  const mins = Math.round(diffMs / 60000);
  if (!Number.isFinite(mins) || mins <= 0) {
    throw new ApiError(400, "INVALID_LESSON_DURATION", "durationMinutes noto'g'ri");
  }
  return mins;
}

function normalizeRequestedPeriodMonth(periodMonth) {
  const normalized = cleanOptionalString(periodMonth);
  if (normalized) {
    monthKeyToUtcRange(normalized);
    return normalized;
  }
  return monthKeyFromDateValue(new Date());
}

function parseBooleanFlag(value, defaultValue = true) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

module.exports = {
  monthKeyFromDateValue,
  monthKeyToUtcRange,
  computeDurationMinutes,
  normalizeRequestedPeriodMonth,
  parseBooleanFlag,
};
