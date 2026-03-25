const { ApiError } = require("../../../utils/apiError");
const { utcDateToTashkentIsoDate } = require("../../../utils/tashkentTime");

const SENTYABR_MONTH_INDEX = 8; // JS: 0-based

function parseAcademicYear(value) {
  const raw = String(value || "").trim().replace(/\s+/g, "");
  const match = raw.match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;

  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end !== start + 1) {
    return null;
  }

  return { start, end, value: `${start}-${end}` };
}

function getCurrentAcademicYear(date = new Date()) {
  const tashkentIso = utcDateToTashkentIsoDate(date);
  const [yearRaw, monthRaw] = String(tashkentIso).split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    throw new ApiError(400, "INVALID_DATE", "Sana noto'g'ri");
  }

  if (month >= SENTYABR_MONTH_INDEX) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

function getPreviousAcademicYear(targetAcademicYear) {
  const parsed = parseAcademicYear(targetAcademicYear);
  if (!parsed) return null;
  return `${parsed.start - 1}-${parsed.end - 1}`;
}

function getNextAcademicYear(currentAcademicYear) {
  const parsed = parseAcademicYear(currentAcademicYear);
  if (!parsed) return null;
  return `${parsed.start + 1}-${parsed.end + 1}`;
}

function isSeptemberInTashkent(date = new Date()) {
  const tashkentIso = utcDateToTashkentIsoDate(date);
  const month = Number.parseInt(String(tashkentIso).split("-")[1], 10) - 1;
  return month === SENTYABR_MONTH_INDEX;
}

module.exports = {
  SENTYABR_MONTH_INDEX,
  parseAcademicYear,
  getCurrentAcademicYear,
  getPreviousAcademicYear,
  getNextAcademicYear,
  isSeptemberInTashkent,
};
