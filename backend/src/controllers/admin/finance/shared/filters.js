const { Prisma } = require("@prisma/client");
const { monthKeyFromDate } = require("../../../../services/financeDebtService");

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

function buildWhereSql({ search, classroomId }) {
  const whereClauses = [];

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

  if (classroomId) {
    whereClauses.push(Prisma.sql`ae."classroomId" = ${classroomId}`);
  }

  if (!whereClauses.length) return Prisma.empty;
  return Prisma.sql`WHERE ${Prisma.join(whereClauses, Prisma.sql` AND `)}`;
}

function buildStatusSql() {
  return Prisma.empty;
}

function buildDebtMonthSql() {
  return Prisma.empty;
}

module.exports = {
  filterFinanceRowsByQuery,
  mapStudentRowFromRaw,
  buildWhereSql,
  buildStatusSql,
  buildDebtMonthSql,
};
