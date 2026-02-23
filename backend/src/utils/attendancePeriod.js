const { ApiError } = require("./apiError");
const {
  localTodayIsoDateTashkent,
  localDayRangeUtc,
  addDaysToIsoDate,
  isIsoDateString,
  weekdayFromIsoDate,
} = require("./tashkentTime");

const PERIOD_TYPES = ["KUNLIK", "HAFTALIK", "OYLIK", "CHORAKLIK", "YILLIK"];

function isStrictIsoDateString(value) {
  if (!isIsoDateString(value)) return false;
  try {
    // validate existing real calendar date using helper parsing path
    localDayRangeUtc(String(value));
    return true;
  } catch {
    return false;
  }
}

function localTodayIsoDate() {
  return localTodayIsoDateTashkent();
}

function parseSanaOrToday(value) {
  const sanaStr = value || localTodayIsoDate();
  if (!isStrictIsoDateString(sanaStr)) {
    throw new ApiError(400, "SANA_NOTOGRI", "Sana noto'g'ri formatda yoki mavjud bo'lmagan sana");
  }
  // Keep "sana" as UTC midnight of the selected ISO date for existing controllers that use date parts.
  const sana = new Date(`${sanaStr}T00:00:00.000Z`);
  return { sanaStr, sana };
}

function startOfWeekUTC(date) {
  const iso = date.toISOString().slice(0, 10);
  const day = weekdayFromIsoDate(iso);
  const diff = day === 0 ? 6 : day - 1;
  const weekStartIso = addDaysToIsoDate(iso, -diff);
  return localDayRangeUtc(weekStartIso).from;
}

function startOfMonthUTC(date) {
  const iso = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
  return localDayRangeUtc(iso).from;
}

function startOfQuarterUTC(date) {
  const month = date.getUTCMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const iso = `${date.getUTCFullYear()}-${String(quarterStartMonth + 1).padStart(2, "0")}-01`;
  return localDayRangeUtc(iso).from;
}

function startOfYearUTC(date) {
  return localDayRangeUtc(`${date.getUTCFullYear()}-01-01`).from;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function buildRangeByType(periodType, sana) {
  const type = PERIOD_TYPES.includes(periodType) ? periodType : "OYLIK";
  const sanaIso = sana.toISOString().slice(0, 10);
  let from = localDayRangeUtc(sanaIso).from;
  let to = localDayRangeUtc(addDaysToIsoDate(sanaIso, 1)).from;

  if (type === "HAFTALIK") {
    from = startOfWeekUTC(sana);
    to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (type === "OYLIK") {
    from = startOfMonthUTC(sana);
    to = startOfMonthUTC(new Date(Date.UTC(sana.getUTCFullYear(), sana.getUTCMonth() + 1, 1)));
  } else if (type === "CHORAKLIK") {
    from = startOfQuarterUTC(sana);
    const tmp = new Date(sana);
    tmp.setUTCMonth(Math.floor(sana.getUTCMonth() / 3) * 3 + 3, 1);
    to = startOfQuarterUTC(tmp);
  } else if (type === "YILLIK") {
    from = startOfYearUTC(sana);
    to = startOfYearUTC(new Date(Date.UTC(sana.getUTCFullYear() + 1, 0, 1)));
  }

  return { type, from, to };
}

function buildAllRanges(sana) {
  return {
    kunlik: buildRangeByType("KUNLIK", sana),
    haftalik: buildRangeByType("HAFTALIK", sana),
    oylik: buildRangeByType("OYLIK", sana),
    choraklik: buildRangeByType("CHORAKLIK", sana),
    yillik: buildRangeByType("YILLIK", sana),
  };
}

module.exports = {
  PERIOD_TYPES,
  localTodayIsoDate,
  parseSanaOrToday,
  buildRangeByType,
  buildAllRanges,
};
