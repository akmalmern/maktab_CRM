const { ApiError } = require("./apiError");

// Uzbekistan (Tashkent) is UTC+5, no DST.
const TASHKENT_OFFSET_HOURS = 5;
const TASHKENT_OFFSET_MS = TASHKENT_OFFSET_HOURS * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function isIsoDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function parseIsoDateParts(dateStr) {
  if (!isIsoDateString(dateStr)) {
    throw new ApiError(400, "INVALID_DATE", "Sana formati YYYY-MM-DD bo'lishi kerak");
  }
  const [y, m, d] = String(dateStr).split("-").map((v) => Number.parseInt(v, 10));
  const test = new Date(Date.UTC(y, m - 1, d));
  if (
    Number.isNaN(test.getTime()) ||
    test.getUTCFullYear() !== y ||
    test.getUTCMonth() + 1 !== m ||
    test.getUTCDate() !== d
  ) {
    throw new ApiError(400, "INVALID_DATE", "Sana mavjud emas");
  }
  return { year: y, month: m, day: d };
}

function isoDateFromParts(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDaysToIsoDate(dateStr, days) {
  const { year, month, day } = parseIsoDateParts(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return isoDateFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function localDayStartUtc(dateStr) {
  const { year, month, day } = parseIsoDateParts(dateStr);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - TASHKENT_OFFSET_MS);
}

function localDayEndUtc(dateStr) {
  return new Date(localDayStartUtc(addDaysToIsoDate(dateStr, 1)).getTime() - 1);
}

function localDayRangeUtc(dateStr) {
  const from = localDayStartUtc(dateStr);
  const to = localDayStartUtc(addDaysToIsoDate(dateStr, 1));
  return { from, to };
}

function utcDateToTashkentIsoDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() + TASHKENT_OFFSET_MS);
  return isoDateFromParts(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

function localTodayIsoDateTashkent() {
  return utcDateToTashkentIsoDate(new Date());
}

function weekdayFromIsoDate(dateStr) {
  const { year, month, day } = parseIsoDateParts(dateStr);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function combineLocalDateAndTimeToUtc(dateStr, timeStr) {
  const { year, month, day } = parseIsoDateParts(dateStr);
  const [hhRaw, mmRaw] = String(timeStr || "").split(":");
  const hh = Number.parseInt(hhRaw, 10);
  const mm = Number.parseInt(mmRaw, 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day, hh, mm, 0, 0) - TASHKENT_OFFSET_MS);
}

module.exports = {
  TASHKENT_OFFSET_HOURS,
  TASHKENT_OFFSET_MS,
  DAY_MS,
  isIsoDateString,
  parseIsoDateParts,
  isoDateFromParts,
  addDaysToIsoDate,
  localDayStartUtc,
  localDayEndUtc,
  localDayRangeUtc,
  utcDateToTashkentIsoDate,
  localTodayIsoDateTashkent,
  weekdayFromIsoDate,
  combineLocalDateAndTimeToUtc,
};
