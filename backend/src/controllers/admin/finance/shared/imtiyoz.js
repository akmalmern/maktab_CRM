const {
  buildMonthRange,
  buildImtiyozMonthMap,
  parseMonthKey,
  resolveImtiyozStartMonthKey,
} = require("../../../../services/financeDebtService");

function calculateImtiyozOySumma({ turi, qiymat, oylikSumma }) {
  const base = Number(oylikSumma || 0);
  if (!base) return 0;
  if (turi === "TOLIQ_OZOD") return 0;
  if (turi === "FOIZ") {
    const foiz = Math.max(0, Math.min(100, Number(qiymat || 0)));
    return Math.max(0, Math.round((base * (100 - foiz)) / 100));
  }
  if (turi === "SUMMA") {
    return Math.max(0, base - Number(qiymat || 0));
  }
  return base;
}

function buildImtiyozSnapshotRows({
  turi,
  qiymat,
  boshlanishOy,
  oylarSoni,
  oylikSumma,
}) {
  const months = buildMonthRange(boshlanishOy, Number(oylarSoni || 1));
  return months.map((month) => {
    const key = `${month.yil}-${String(month.oy).padStart(2, "0")}`;
    return {
      key,
      yil: month.yil,
      oy: month.oy,
      oySumma: calculateImtiyozOySumma({
        turi,
        qiymat,
        oylikSumma,
      }),
    };
  });
}

function parseImtiyozStartPartsFromKey(monthKey) {
  try {
    const { year, month } = parseMonthKey(monthKey);
    return { boshlanishYil: year, boshlanishOyRaqam: month };
  } catch {
    return { boshlanishYil: null, boshlanishOyRaqam: null };
  }
}

function mapImtiyozRow(row, { safeFormatMonthKey, monthKeyToSerial }) {
  const start = resolveImtiyozStartMonthKey(row);
  let rangeLabel = safeFormatMonthKey(start);
  const snapshotKeys = Array.isArray(row.oylarSnapshot)
    ? row.oylarSnapshot
        .map((entry) => {
          if (typeof entry?.key === "string") return entry.key;
          if (
            Number.isFinite(Number(entry?.yil)) &&
            Number.isFinite(Number(entry?.oy))
          ) {
            return `${Number(entry.yil)}-${String(Number(entry.oy)).padStart(2, "0")}`;
          }
          return null;
        })
        .filter(Boolean)
        .sort((a, b) => (monthKeyToSerial(a) || 0) - (monthKeyToSerial(b) || 0))
    : [];

  if (snapshotKeys.length > 1) {
    rangeLabel = `${safeFormatMonthKey(snapshotKeys[0])} - ${safeFormatMonthKey(snapshotKeys[snapshotKeys.length - 1])}`;
  } else if (snapshotKeys.length === 1) {
    rangeLabel = safeFormatMonthKey(snapshotKeys[0]);
  } else if (row.oylarSoni > 1) {
    const months = buildMonthRange(start, row.oylarSoni);
    const last = months[months.length - 1];
    const lastKey = `${last.yil}-${String(last.oy).padStart(2, "0")}`;
    rangeLabel = `${safeFormatMonthKey(start)} - ${safeFormatMonthKey(lastKey)}`;
  }

  return {
    id: row.id,
    turi: row.turi,
    qiymat: row.qiymat,
    boshlanishOy: start,
    boshlanishYil: row.boshlanishYil ?? null,
    boshlanishOyRaqam: row.boshlanishOyRaqam ?? null,
    oylarSoni: row.oylarSoni,
    oylarSnapshot: Array.isArray(row.oylarSnapshot) ? row.oylarSnapshot : [],
    sabab: row.sabab,
    izoh: row.izoh || "",
    isActive: row.isActive,
    davrLabel: rangeLabel,
    createdAt: row.createdAt,
    bekorQilinganAt: row.bekorQilinganAt,
    bekorQilishSababi: row.bekorQilishSababi || "",
  };
}

function buildStudentImtiyozMap(imtiyozRows, oylikSumma) {
  const grouped = new Map();
  for (const row of imtiyozRows || []) {
    if (!grouped.has(row.studentId)) grouped.set(row.studentId, []);
    grouped.get(row.studentId).push(row);
  }

  const map = new Map();
  for (const [studentId, rows] of grouped.entries()) {
    map.set(studentId, buildImtiyozMonthMap({ imtiyozlar: rows, oylikSumma }));
  }
  return map;
}

module.exports = {
  calculateImtiyozOySumma,
  buildImtiyozSnapshotRows,
  parseImtiyozStartPartsFromKey,
  mapImtiyozRow,
  buildStudentImtiyozMap,
};
