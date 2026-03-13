const { Prisma } = require("@prisma/client");
const prisma = require("../../../../prisma");
const { buildWhereSql } = require("../shared/filters");

function buildStatusSql(status = "ALL") {
  return status === "QARZDOR"
    ? Prisma.sql`AND COALESCE(d."totalDebtAmount", 0) > 0`
    : status === "TOLAGAN"
      ? Prisma.sql`AND COALESCE(d."totalDebtAmount", 0) <= 0`
      : Prisma.empty;
}

function buildDebtMonthSql({ debtMonth = "ALL", targetYear = null, targetMonth = null }) {
  return targetYear && targetMonth
    ? Prisma.sql`AND COALESCE(d."selectedMonthDebtAmount", 0) > 0`
    : debtMonth === "CURRENT"
      ? Prisma.sql`AND COALESCE(d."thisMonthDebtAmount", 0) > 0`
      : debtMonth === "PREVIOUS"
        ? Prisma.sql`AND COALESCE(d."previousMonthDebtAmount", 0) > 0`
        : Prisma.empty;
}

function buildFilteredDebtScopeSql({
  search,
  classroomId,
  classroomIds,
  status = "ALL",
  debtMonth = "ALL",
  targetYear = null,
  targetMonth = null,
  currentYear,
  currentMonth,
  previousYear,
  previousMonth,
}) {
  const whereSql = buildWhereSql({ search, classroomId, classroomIds });
  const statusSql = buildStatusSql(status);
  const debtMonthSql = buildDebtMonthSql({ debtMonth, targetYear, targetMonth });

  return Prisma.sql`
    WITH active_enrollment AS (
      SELECT DISTINCT ON (e."studentId")
        e."studentId",
        e."classroomId"
      FROM "Enrollment" e
      WHERE e."isActive" = true
      ORDER BY e."studentId", e."createdAt" DESC
    ),
    base AS (
      SELECT
        s.id,
        s."firstName",
        s."lastName",
        u.username,
        ae."classroomId",
        c.name AS "classroomName",
        c."academicYear"
      FROM "Student" s
      LEFT JOIN "User" u ON u.id = s."userId"
      LEFT JOIN active_enrollment ae ON ae."studentId" = s.id
      LEFT JOIN "Classroom" c ON c.id = ae."classroomId"
      ${whereSql}
    ),
    debt AS (
      SELECT
        m."studentId",
        COUNT(*) FILTER (WHERE m."qoldiqSumma" > 0)::int AS "debtMonths",
        COALESCE(SUM(CASE WHEN m."qoldiqSumma" > 0 THEN m."qoldiqSumma" ELSE 0 END), 0)::int AS "totalDebtAmount",
        COALESCE(SUM(CASE WHEN m.yil = ${currentYear} AND m.oy = ${currentMonth} THEN m."qoldiqSumma" ELSE 0 END), 0)::int AS "thisMonthDebtAmount",
        COALESCE(SUM(CASE WHEN m.yil = ${previousYear} AND m.oy = ${previousMonth} THEN m."qoldiqSumma" ELSE 0 END), 0)::int AS "previousMonthDebtAmount",
        COALESCE(SUM(CASE WHEN ${targetYear}::int IS NOT NULL AND m.yil = ${targetYear}::int AND m.oy = ${targetMonth}::int THEN m."qoldiqSumma" ELSE 0 END), 0)::int AS "selectedMonthDebtAmount"
      FROM "StudentOyMajburiyat" m
      WHERE m.yil < ${currentYear} OR (m.yil = ${currentYear} AND m.oy <= ${currentMonth})
      GROUP BY m."studentId"
    ),
    filtered AS (
      SELECT
        b.id AS "studentId",
        b."firstName",
        b."lastName",
        b.username,
        b."classroomId",
        b."classroomName",
        b."academicYear",
        COALESCE(d."debtMonths", 0)::int AS "debtMonths",
        COALESCE(d."totalDebtAmount", 0)::int AS "totalDebtAmount",
        COALESCE(d."thisMonthDebtAmount", 0)::int AS "thisMonthDebtAmount",
        COALESCE(d."previousMonthDebtAmount", 0)::int AS "previousMonthDebtAmount",
        COALESCE(d."selectedMonthDebtAmount", 0)::int AS "selectedMonthDebtAmount"
      FROM base b
      LEFT JOIN debt d ON d."studentId" = b.id
      WHERE 1 = 1
      ${statusSql}
      ${debtMonthSql}
    )
  `;
}

async function fetchFinanceSummaryAggregate({
  prismaClient = prisma,
  search,
  classroomId,
  classroomIds,
  status = "ALL",
  debtMonth = "ALL",
  targetYear = null,
  targetMonth = null,
  currentYear,
  currentMonth,
  previousYear,
  previousMonth,
}) {
  const scopeSql = buildFilteredDebtScopeSql({
    search,
    classroomId,
    classroomIds,
    status,
    debtMonth,
    targetYear,
    targetMonth,
    currentYear,
    currentMonth,
    previousYear,
    previousMonth,
  });

  const rows = await prismaClient.$queryRaw`
    ${scopeSql}
    SELECT
      COUNT(*)::int AS "totalRows",
      COUNT(*) FILTER (WHERE "totalDebtAmount" > 0)::int AS "totalDebtors",
      COALESCE(SUM("totalDebtAmount"), 0)::int AS "totalDebtAmount",
      COUNT(*) FILTER (WHERE "thisMonthDebtAmount" > 0)::int AS "thisMonthDebtors",
      COUNT(*) FILTER (WHERE "previousMonthDebtAmount" > 0)::int AS "previousMonthDebtors",
      COUNT(*) FILTER (WHERE "selectedMonthDebtAmount" > 0)::int AS "selectedMonthDebtors",
      COALESCE(SUM("thisMonthDebtAmount"), 0)::int AS "thisMonthDebtAmount",
      COALESCE(SUM("previousMonthDebtAmount"), 0)::int AS "previousMonthDebtAmount",
      COALESCE(SUM("selectedMonthDebtAmount"), 0)::int AS "selectedMonthDebtAmount"
    FROM filtered
  `;

  return rows?.[0] || {
    totalRows: 0,
    totalDebtors: 0,
    totalDebtAmount: 0,
    thisMonthDebtors: 0,
    previousMonthDebtors: 0,
    selectedMonthDebtors: 0,
    thisMonthDebtAmount: 0,
    previousMonthDebtAmount: 0,
    selectedMonthDebtAmount: 0,
  };
}

async function fetchFinanceTopDebtors({
  prismaClient = prisma,
  search,
  classroomId,
  classroomIds,
  status = "ALL",
  debtMonth = "ALL",
  targetYear = null,
  targetMonth = null,
  currentYear,
  currentMonth,
  previousYear,
  previousMonth,
  limit = 10,
}) {
  const scopeSql = buildFilteredDebtScopeSql({
    search,
    classroomId,
    classroomIds,
    status,
    debtMonth,
    targetYear,
    targetMonth,
    currentYear,
    currentMonth,
    previousYear,
    previousMonth,
  });

  return prismaClient.$queryRaw`
    ${scopeSql}
    SELECT
      "studentId",
      TRIM(CONCAT(COALESCE("firstName", ''), ' ', COALESCE("lastName", ''))) AS "fullName",
      COALESCE(username, '-') AS username,
      "classroomId",
      CASE
        WHEN "classroomName" IS NOT NULL AND "academicYear" IS NOT NULL
          THEN CONCAT("classroomName", ' (', "academicYear", ')')
        ELSE '-'
      END AS classroom,
      "totalDebtAmount",
      "thisMonthDebtAmount",
      "previousMonthDebtAmount",
      "selectedMonthDebtAmount",
      "debtMonths"
    FROM filtered
    WHERE "totalDebtAmount" > 0
    ORDER BY "totalDebtAmount" DESC, "thisMonthDebtAmount" DESC, "debtMonths" DESC
    LIMIT ${Math.max(1, Number(limit || 10))}
  `;
}

async function fetchFinanceTopDebtorClassrooms({
  prismaClient = prisma,
  search,
  classroomId,
  classroomIds,
  status = "ALL",
  debtMonth = "ALL",
  targetYear = null,
  targetMonth = null,
  currentYear,
  currentMonth,
  previousYear,
  previousMonth,
  limit = 10,
}) {
  const scopeSql = buildFilteredDebtScopeSql({
    search,
    classroomId,
    classroomIds,
    status,
    debtMonth,
    targetYear,
    targetMonth,
    currentYear,
    currentMonth,
    previousYear,
    previousMonth,
  });

  return prismaClient.$queryRaw`
    ${scopeSql}
    SELECT
      "classroomId",
      CASE
        WHEN "classroomName" IS NOT NULL AND "academicYear" IS NOT NULL
          THEN CONCAT("classroomName", ' (', "academicYear", ')')
        ELSE '-'
      END AS classroom,
      COUNT(*)::int AS "debtorCount",
      COALESCE(SUM("totalDebtAmount"), 0)::int AS "totalDebtAmount",
      COALESCE(SUM("thisMonthDebtAmount"), 0)::int AS "thisMonthDebtAmount",
      COALESCE(SUM("previousMonthDebtAmount"), 0)::int AS "previousMonthDebtAmount",
      COALESCE(SUM("selectedMonthDebtAmount"), 0)::int AS "selectedMonthDebtAmount"
    FROM filtered
    WHERE "totalDebtAmount" > 0
    GROUP BY "classroomId", "classroomName", "academicYear"
    ORDER BY "totalDebtAmount" DESC, "debtorCount" DESC, classroom ASC
    LIMIT ${Math.max(1, Number(limit || 10))}
  `;
}

async function fetchFilteredMonthlyPlanAggregate({
  prismaClient = prisma,
  search,
  classroomId,
  classroomIds,
  status = "ALL",
  debtMonth = "ALL",
  targetYear = null,
  targetMonth = null,
  currentYear,
  currentMonth,
  previousYear,
  previousMonth,
}) {
  const scopeSql = buildFilteredDebtScopeSql({
    search,
    classroomId,
    classroomIds,
    status,
    debtMonth,
    targetYear,
    targetMonth,
    currentYear,
    currentMonth,
    previousYear,
    previousMonth,
  });

  const rows = await prismaClient.$queryRaw`
    ${scopeSql}
    SELECT
      COALESCE(SUM(m."netSumma"), 0)::int AS "monthlyPlanAmount"
    FROM filtered f
    LEFT JOIN "StudentOyMajburiyat" m
      ON m."studentId" = f."studentId"
     AND m.yil = ${currentYear}
     AND m.oy = ${currentMonth}
  `;

  return rows?.[0] || { monthlyPlanAmount: 0 };
}

async function fetchFilteredPaidAmounts({
  prismaClient = prisma,
  search,
  classroomId,
  classroomIds,
  status = "ALL",
  debtMonth = "ALL",
  targetYear = null,
  targetMonth = null,
  currentYear,
  currentMonth,
  previousYear,
  previousMonth,
  monthStart,
  monthEnd,
  yearStart,
  yearEnd,
}) {
  const scopeSql = buildFilteredDebtScopeSql({
    search,
    classroomId,
    classroomIds,
    status,
    debtMonth,
    targetYear,
    targetMonth,
    currentYear,
    currentMonth,
    previousYear,
    previousMonth,
  });

  const rows = await prismaClient.$queryRaw`
    ${scopeSql}
    SELECT
      COALESCE(SUM(CASE WHEN t."tolovSana" >= ${monthStart} AND t."tolovSana" < ${monthEnd} THEN t.summa ELSE 0 END), 0)::int AS "thisMonthPaidAmount",
      COALESCE(SUM(CASE WHEN t."tolovSana" >= ${yearStart} AND t."tolovSana" < ${yearEnd} THEN t.summa ELSE 0 END), 0)::int AS "thisYearPaidAmount"
    FROM filtered f
    LEFT JOIN "TolovTranzaksiya" t
      ON t."studentId" = f."studentId"
     AND t.holat = 'AKTIV'
  `;

  return rows?.[0] || { thisMonthPaidAmount: 0, thisYearPaidAmount: 0 };
}

module.exports = {
  fetchFinanceSummaryAggregate,
  fetchFinanceTopDebtors,
  fetchFinanceTopDebtorClassrooms,
  fetchFilteredMonthlyPlanAggregate,
  fetchFilteredPaidAmounts,
};
