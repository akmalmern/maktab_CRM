const { ApiError } = require("../utils/apiError");

const OY_NOMLARI = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

function parseMonthKey(monthKey) {
  const [yearStr, monthStr] = String(monthKey).split("-");
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new ApiError(400, "INVALID_MONTH", "Oy formati noto'g'ri: YYYY-MM");
  }
  return { year, month };
}

function formatMonthByParts(yil, oy) {
  const name = OY_NOMLARI[oy - 1] || String(oy);
  return `${name} ${yil}`;
}

function formatMonthKey(monthKey) {
  const { year, month } = parseMonthKey(monthKey);
  return formatMonthByParts(year, month);
}

function monthKeyFromDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(year, month) {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

function buildMonthRange(startMonthKey, monthsCount) {
  const count = Number.parseInt(String(monthsCount), 10);
  if (!Number.isFinite(count) || count < 1) {
    throw new ApiError(400, "INVALID_MONTH_COUNT", "Oylar soni noto'g'ri");
  }

  const start = parseMonthKey(startMonthKey);
  const result = [];
  let cursor = start;
  for (let i = 0; i < count; i += 1) {
    result.push({ yil: cursor.year, oy: cursor.month });
    cursor = nextMonth(cursor.year, cursor.month);
  }
  return result;
}

function buildDueMonths(fromDateInput, toDateInput = new Date()) {
  const fromDate = new Date(fromDateInput);
  const toDate = new Date(toDateInput);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return [];
  }

  const start = {
    year: fromDate.getUTCFullYear(),
    month: fromDate.getUTCMonth() + 1,
  };
  const end = {
    year: toDate.getUTCFullYear(),
    month: toDate.getUTCMonth() + 1,
  };

  if (start.year > end.year || (start.year === end.year && start.month > end.month)) {
    return [];
  }

  const result = [];
  let cursor = start;

  while (cursor.year < end.year || (cursor.year === end.year && cursor.month <= end.month)) {
    const key = `${cursor.year}-${String(cursor.month).padStart(2, "0")}`;
    result.push({
      yil: cursor.year,
      oy: cursor.month,
      key,
      label: formatMonthByParts(cursor.year, cursor.month),
    });
    cursor = nextMonth(cursor.year, cursor.month);
  }
  return result;
}

function buildPaidMonthMap(qoplamalar) {
  const paidMonthMap = new Map();
  for (const row of qoplamalar || []) {
    if (!paidMonthMap.has(row.studentId)) paidMonthMap.set(row.studentId, new Set());
    paidMonthMap.get(row.studentId).add(`${row.yil}-${String(row.oy).padStart(2, "0")}`);
  }
  return paidMonthMap;
}

function buildDebtInfo({ startDate, paidMonthSet, oylikSumma, now = new Date() }) {
  const dueMonths = buildDueMonths(startDate, now);
  const qarzOylar = dueMonths.filter((m) => !paidMonthSet.has(m.key));
  const tolanganOylarSoni = dueMonths.length - qarzOylar.length;
  const jamiQarzSumma = qarzOylar.length * oylikSumma;

  return {
    dueMonthsCount: dueMonths.length,
    tolanganOylarSoni,
    qarzOylar,
    qarzOylarSoni: qarzOylar.length,
    jamiQarzSumma,
    holat: qarzOylar.length ? "QARZDOR" : "TOLAGAN",
  };
}

module.exports = {
  OY_NOMLARI,
  parseMonthKey,
  formatMonthByParts,
  formatMonthKey,
  monthKeyFromDate,
  buildMonthRange,
  buildDueMonths,
  buildPaidMonthMap,
  buildDebtInfo,
};
