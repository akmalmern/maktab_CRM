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
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
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

function monthKeyFromParts(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthKeyToSerial(monthKey) {
  try {
    const { year, month } = parseMonthKey(monthKey);
    return year * 12 + month;
  } catch {
    return null;
  }
}

function calculateImtiyozMonthAmount({ turi, qiymat, oylikSumma }) {
  const base = Number(oylikSumma || 0);
  if (!base) return 0;

  if (turi === "TOLIQ_OZOD") return 0;
  if (turi === "FOIZ") {
    const foiz = Math.max(0, Math.min(100, Number(qiymat || 0)));
    return Math.max(0, Math.round((base * (100 - foiz)) / 100));
  }
  if (turi === "SUMMA") {
    const chegirmaSumma = Number(qiymat || 0);
    return Math.max(0, base - chegirmaSumma);
  }
  return base;
}

function normalizeSnapshotRows({ item, oylikSumma }) {
  const base = Number(oylikSumma || 0);
  if (!item) return [];

  // Yangi yozuvlarda snapshot saqlanadi: deactivation tarixni buzmaydi.
  if (Array.isArray(item.oylarSnapshot) && item.oylarSnapshot.length) {
    return item.oylarSnapshot
      .map((entry) => {
        const key =
          typeof entry?.key === "string"
            ? entry.key
            : Number.isFinite(Number(entry?.yil)) &&
                Number.isFinite(Number(entry?.oy))
              ? monthKeyFromParts(Number(entry.yil), Number(entry.oy))
              : null;
        const oySumma = Number(
          entry?.oySumma ?? entry?.summa ?? entry?.amount ?? base,
        );
        if (!key || !Number.isFinite(oySumma)) return null;
        return { key, oySumma: Math.max(0, oySumma) };
      })
      .filter(Boolean);
  }

  // Legacy yozuvlar uchun fallback (snapshot yo'q bo'lsa).
  let months = [];
  try {
    months = buildMonthRange(item.boshlanishOy, item.oylarSoni || 1);
  } catch {
    return [];
  }

  let deactivateFromSerial = null;
  if (item.isActive === false && item.bekorQilinganAt) {
    deactivateFromSerial = monthKeyToSerial(
      monthKeyFromDate(new Date(item.bekorQilinganAt)),
    );
  }

  return months
    .map((month) => {
      const key = monthKeyFromParts(month.yil, month.oy);
      const serial = month.yil * 12 + month.oy;
      if (deactivateFromSerial !== null && serial >= deactivateFromSerial) {
        return null;
      }
      return {
        key,
        oySumma: calculateImtiyozMonthAmount({
          turi: item.turi,
          qiymat: item.qiymat,
          oylikSumma: base,
        }),
      };
    })
    .filter(Boolean);
}

function buildImtiyozMonthMap({ imtiyozlar, oylikSumma }) {
  const monthAmountMap = new Map();
  const base = Number(oylikSumma || 0);
  if (!base || !Array.isArray(imtiyozlar) || !imtiyozlar.length)
    return monthAmountMap;

  for (const item of imtiyozlar) {
    if (!item) continue;
    const snapshotRows = normalizeSnapshotRows({ item, oylikSumma: base });
    for (const row of snapshotRows) {
      const key = row.key;
      const oldAmount = monthAmountMap.has(key)
        ? monthAmountMap.get(key)
        : base;
      const nextAmount = Math.max(0, Number(row.oySumma || 0));

      // Bir oyda bir nechta imtiyoz bo'lsa, student uchun eng foydalisini qoldiramiz.
      monthAmountMap.set(key, Math.min(oldAmount, nextAmount));
    }
  }

  return monthAmountMap;
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

  if (
    start.year > end.year ||
    (start.year === end.year && start.month > end.month)
  ) {
    return [];
  }

  const result = [];
  let cursor = start;

  while (
    cursor.year < end.year ||
    (cursor.year === end.year && cursor.month <= end.month)
  ) {
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
    if (!paidMonthMap.has(row.studentId))
      paidMonthMap.set(row.studentId, new Set());
    paidMonthMap
      .get(row.studentId)
      .add(`${row.yil}-${String(row.oy).padStart(2, "0")}`);
  }
  return paidMonthMap;
}

function buildDebtInfo({
  startDate,
  paidMonthSet,
  oylikSumma,
  imtiyozMonthMap = new Map(),
  now = new Date(),
}) {
  const dueMonths = buildDueMonths(startDate, now);
  const dueMonthsWithAmount = dueMonths.map((m) => ({
    ...m,
    oySumma: imtiyozMonthMap.has(m.key)
      ? Number(imtiyozMonthMap.get(m.key) || 0)
      : Number(oylikSumma || 0),
    isPaid: paidMonthSet.has(m.key),
  }));
  const qarzOylar = dueMonthsWithAmount.filter(
    (m) => !m.isPaid && m.oySumma > 0,
  );
  const tolanganOylarSoni = dueMonthsWithAmount.length - qarzOylar.length;
  const jamiQarzSumma = qarzOylar.reduce(
    (acc, row) => acc + Number(row.oySumma || 0),
    0,
  );

  return {
    dueMonths: dueMonthsWithAmount,
    dueMonthsCount: dueMonthsWithAmount.length,
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
  buildImtiyozMonthMap,
  buildDebtInfo,
};
