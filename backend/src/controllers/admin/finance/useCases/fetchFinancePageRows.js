async function executeFetchFinancePageRows({
  deps,
  search,
  classroomId,
  classroomIds,
  status = "ALL",
  debtMonth = "ALL",
  debtTargetMonth,
  page,
  limit,
}) {
  const {
    Prisma,
    prisma,
    buildWhereSql,
    summarizeDebtFromMajburiyatRows,
    mapStudentRowFromRaw,
  } = deps;

  const whereSql = buildWhereSql({ search, classroomId, classroomIds });
  const offset = (page - 1) * limit;
  const selectedMonthKey = debtTargetMonth?.key || null;
  const targetYear = debtTargetMonth?.year || null;
  const targetMonth = debtTargetMonth?.month || null;
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const previousDate = new Date(Date.UTC(currentYear, currentMonth - 2, 1));
  const previousYear = previousDate.getUTCFullYear();
  const previousMonth = previousDate.getUTCMonth() + 1;
  const statusSql =
    status === "QARZDOR"
      ? Prisma.sql`AND COALESCE(d."totalDebtAmount", 0) > 0`
      : status === "TOLAGAN"
        ? Prisma.sql`AND COALESCE(d."totalDebtAmount", 0) <= 0`
        : Prisma.empty;
  const debtMonthSql = selectedMonthKey
    ? Prisma.sql`AND COALESCE(d."selectedMonthDebtAmount", 0) > 0`
    : debtMonth === "CURRENT"
      ? Prisma.sql`AND COALESCE(d."thisMonthDebtAmount", 0) > 0`
      : debtMonth === "PREVIOUS"
        ? Prisma.sql`AND COALESCE(d."previousMonthDebtAmount", 0) > 0`
        : Prisma.empty;

  const baseCteSql = Prisma.sql`
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
        s."createdAt",
        u.username,
        u.phone,
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
        COALESCE(SUM(CASE WHEN m."qoldiqSumma" > 0 THEN m."qoldiqSumma" ELSE 0 END), 0)::int AS "totalDebtAmount",
        COALESCE(SUM(CASE WHEN m.yil = ${currentYear} AND m.oy = ${currentMonth} THEN m."qoldiqSumma" ELSE 0 END), 0)::int AS "thisMonthDebtAmount",
        COALESCE(SUM(CASE WHEN m.yil = ${previousYear} AND m.oy = ${previousMonth} THEN m."qoldiqSumma" ELSE 0 END), 0)::int AS "previousMonthDebtAmount",
        COALESCE(SUM(CASE WHEN ${targetYear}::int IS NOT NULL AND m.yil = ${targetYear}::int AND m.oy = ${targetMonth}::int THEN m."qoldiqSumma" ELSE 0 END), 0)::int AS "selectedMonthDebtAmount"
      FROM "StudentOyMajburiyat" m
      WHERE m.yil < ${currentYear} OR (m.yil = ${currentYear} AND m.oy <= ${currentMonth})
      GROUP BY m."studentId"
    )
  `;

  const [countRows, pagedRows] = await prisma.$transaction([
    prisma.$queryRaw`
      ${baseCteSql}
      SELECT COUNT(*)::int AS "count"
      FROM base b
      LEFT JOIN debt d ON d."studentId" = b.id
      WHERE 1 = 1
      ${statusSql}
      ${debtMonthSql}
    `,
    prisma.$queryRaw`
      ${baseCteSql}
      SELECT
        b.id,
        b."firstName",
        b."lastName",
        b.username,
        b.phone,
        b."classroomName",
        b."academicYear",
        b."createdAt" AS "startDate"
      FROM base b
      LEFT JOIN debt d ON d."studentId" = b.id
      WHERE 1 = 1
      ${statusSql}
      ${debtMonthSql}
      ORDER BY b."firstName" ASC, b."lastName" ASC
      LIMIT ${limit} OFFSET ${offset}
    `,
  ]);
  const total = Number(countRows?.[0]?.count || 0);
  const pagedStudentIds = pagedRows.map((row) => row.id);

  const majburiyatRows = pagedStudentIds.length
    ? await prisma.studentOyMajburiyat.findMany({
        where: {
          studentId: { in: pagedStudentIds },
          OR: [
            { yil: { lt: currentYear } },
            { yil: currentYear, oy: { lte: currentMonth } },
          ],
        },
        select: {
          studentId: true,
          yil: true,
          oy: true,
          netSumma: true,
          tolanganSumma: true,
          qoldiqSumma: true,
          holat: true,
        },
      })
    : [];
  const majburiyatMap = new Map();
  for (const row of majburiyatRows) {
    if (!majburiyatMap.has(row.studentId)) majburiyatMap.set(row.studentId, []);
    majburiyatMap.get(row.studentId).push(row);
  }
  const items = pagedRows.map((row) => {
    const debtInfo = summarizeDebtFromMajburiyatRows(majburiyatMap.get(row.id) || []);
    return mapStudentRowFromRaw(row, debtInfo);
  });

  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    items,
  };
}

module.exports = {
  executeFetchFinancePageRows,
};
