const { ApiError } = require("./apiError");

const PERIOD_TYPES = ["KUNLIK", "HAFTALIK", "OYLIK", "CHORAKLIK", "YILLIK"];

function isStrictIsoDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}

function localTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseSanaOrToday(value) {
  const sanaStr = value || localTodayIsoDate();
  if (!isStrictIsoDateString(sanaStr)) {
    throw new ApiError(400, "SANA_NOTOGRI", "Sana noto'g'ri formatda yoki mavjud bo'lmagan sana");
  }
  const sana = new Date(`${sanaStr}T00:00:00.000Z`);
  return { sanaStr, sana };
}

function startOfWeekUTC(date) {
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function startOfMonthUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfQuarterUTC(date) {
  const month = date.getUTCMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3;
  return new Date(Date.UTC(date.getUTCFullYear(), quarterStartMonth, 1));
}

function startOfYearUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function buildRangeByType(periodType, sana) {
  const type = PERIOD_TYPES.includes(periodType) ? periodType : "OYLIK";
  let from = sana;
  let to = addDays(sana, 1);

  if (type === "HAFTALIK") {
    from = startOfWeekUTC(sana);
    to = addDays(from, 7);
  } else if (type === "OYLIK") {
    from = startOfMonthUTC(sana);
    to = new Date(Date.UTC(sana.getUTCFullYear(), sana.getUTCMonth() + 1, 1));
  } else if (type === "CHORAKLIK") {
    from = startOfQuarterUTC(sana);
    to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 3, 1));
  } else if (type === "YILLIK") {
    from = startOfYearUTC(sana);
    to = new Date(Date.UTC(sana.getUTCFullYear() + 1, 0, 1));
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
