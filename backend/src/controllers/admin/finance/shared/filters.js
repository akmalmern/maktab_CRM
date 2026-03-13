const { Prisma } = require("@prisma/client");
const { monthKeyFromDate } = require("../../../../services/financeDebtService");

const ALL_CLASSROOM_SENTINELS = new Set(["all", "hammasi", "barcha"]);

function normalizeClassroomFilterInput(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  if (ALL_CLASSROOM_SENTINELS.has(normalized.toLowerCase())) return null;
  return normalized;
}

function normalizeClassroomFilterList(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeClassroomFilterInput(value))
        .filter(Boolean),
    ),
  );
}

function filterFinanceRowsByQuery(
  rows,
  { status = "ALL", debtMonth = "ALL", debtTargetMonth = null } = {},
) {
  const now = new Date();
  const currentMonthKey = monthKeyFromDate(now);
  const previousMonthKey = monthKeyFromDate(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
  );
  const selectedMonthKey = debtTargetMonth?.key || null;

  return (rows || []).filter((row) => {
    if (status === "QARZDOR" && row.holat !== "QARZDOR") return false;
    if (status === "TOLAGAN" && row.holat !== "TOLAGAN") return false;

    const debtSet = new Set(row.qarzOylar || []);
    if (selectedMonthKey) return debtSet.has(selectedMonthKey);
    if (debtMonth === "CURRENT") return debtSet.has(currentMonthKey);
    if (debtMonth === "PREVIOUS") return debtSet.has(previousMonthKey);
    return true;
  });
}

function mapStudentRowFromRaw(row, debtInfo, { safeFormatMonthKey }) {
  const classroom =
    row.classroomName && row.academicYear
      ? `${row.classroomName} (${row.academicYear})`
      : "-";
  const now = new Date();
  const currentMonthKey = monthKeyFromDate(now);
  const previousMonthKey = monthKeyFromDate(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
  );
  const dueMonthMap = new Map(
    (debtInfo.dueMonths || []).map((item) => [item.key, item]),
  );
  const debtMonthMap = new Map(
    (debtInfo.qarzOylar || []).map((item) => [item.key, item]),
  );

  return {
    id: row.id,
    fullName: `${row.firstName} ${row.lastName}`.trim(),
    username: row.username || "-",
    phone: row.phone || "-",
    classroom,
    holat: debtInfo.holat,
    qarzOylarSoni: debtInfo.qarzOylarSoni,
    qarzOylar: debtInfo.qarzOylar.map((m) => m.key),
    qarzOylarFormatted: debtInfo.qarzOylar.map((m) => safeFormatMonthKey(m.key)),
    qarzOylarDetal: debtInfo.qarzOylar.map((m) => ({
      key: m.key,
      label: m.label,
      oySumma: Number(m.oySumma || 0),
    })),
    tolanganOylarSoni: debtInfo.tolanganOylarSoni,
    jamiQarzSumma: debtInfo.jamiQarzSumma,
    joriyOyMajburiySumma: Number(
      dueMonthMap.get(currentMonthKey)?.oySumma || 0,
    ),
    joriyOyQarzSumma: Number(debtMonthMap.get(currentMonthKey)?.oySumma || 0),
    oldingiOyQarzSumma: Number(
      debtMonthMap.get(previousMonthKey)?.oySumma || 0,
    ),
  };
}

function buildWhereSql({ search, classroomId, classroomIds }) {
  const whereClauses = [];
  const normalizedClassroomId = normalizeClassroomFilterInput(classroomId);
  const normalizedClassroomIds = normalizeClassroomFilterList(classroomIds);

  if (search) {
    const term = `%${search}%`;
    whereClauses.push(
      Prisma.sql`(
        s."firstName" ILIKE ${term}
        OR s."lastName" ILIKE ${term}
        OR u."username" ILIKE ${term}
      )`,
    );
  }

  if (normalizedClassroomId) {
    whereClauses.push(Prisma.sql`ae."classroomId" = ${normalizedClassroomId}`);
  } else if (normalizedClassroomIds.length) {
    whereClauses.push(
      Prisma.sql`ae."classroomId" IN (${Prisma.join(normalizedClassroomIds)})`,
    );
  } else if (Array.isArray(classroomIds)) {
    whereClauses.push(Prisma.sql`1 = 0`);
  }

  if (!whereClauses.length) return Prisma.empty;
  return Prisma.sql`WHERE ${Prisma.join(whereClauses, Prisma.sql` AND `)}`;
}

function buildStatusSql(status = "ALL") {
  if (status === "QARZDOR") {
    return Prisma.sql`WHERE "debtMonths" > 0`;
  }
  if (status === "TOLAGAN") {
    return Prisma.sql`WHERE "debtMonths" <= 0`;
  }
  return Prisma.empty;
}

function buildDebtMonthSql(debtMonth = "ALL", debtTargetMonth = null) {
  if (debtTargetMonth?.key) {
    return Prisma.sql`WHERE "selectedMonthUnpaid" = true`;
  }
  if (debtMonth === "CURRENT") {
    return Prisma.sql`WHERE "thisMonthUnpaid" = true`;
  }
  if (debtMonth === "PREVIOUS") {
    return Prisma.sql`WHERE "previousMonthUnpaid" = true`;
  }
  return Prisma.empty;
}

module.exports = {
  filterFinanceRowsByQuery,
  mapStudentRowFromRaw,
  buildWhereSql,
  buildStatusSql,
  buildDebtMonthSql,
  normalizeClassroomFilterInput,
  normalizeClassroomFilterList,
};
