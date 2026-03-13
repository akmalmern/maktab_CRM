const { Prisma } = require("@prisma/client");
const prisma = require("../../prisma");
const {
  parseSanaOrToday,
  buildRangeByType,
  buildAllRanges,
} = require("../../utils/attendancePeriod");
const {
  utcDateToTashkentIsoDate,
} = require("../../utils/tashkentTime");
const {
  parseIntSafe,
  toIsoDate,
  normalizeHolatCounts,
  calcFoizFromCounts,
  calcFoiz,
  getTeacherAttendanceScopeByUserId,
  getStudentAttendanceScopeByUserId,
} = require("./attendanceScope");

const HOLAT_KEYS = ["KELDI", "KECHIKDI", "SABABLI", "SABABSIZ"];
const HAFTA_KUNI_TO_JS_DAY = {
  DUSHANBA: 1,
  SESHANBA: 2,
  CHORSHANBA: 3,
  PAYSHANBA: 4,
  JUMA: 5,
  SHANBA: 6,
};

function buildBaseWhere({ classroomId, studentId, holat }) {
  return {
    ...(studentId ? { studentId } : {}),
    ...(holat ? { holat } : {}),
    ...(classroomId ? { darsJadvali: { sinfId: classroomId } } : {}),
  };
}

function toIsoRange(range) {
  return {
    from: toIsoDate(range.from),
    toExclusive: toIsoDate(range.to),
    toInclusive: toIsoDate(new Date(range.to.getTime() - 1)),
  };
}

function dayDiffByIsoDates(fromIso, toIsoExclusive) {
  const from = new Date(`${fromIso}T00:00:00.000Z`);
  const to = new Date(`${toIsoExclusive}T00:00:00.000Z`);
  const diff = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

function countWeekdayOccurrencesInRange(fromIso, toIsoExclusive, targetJsDay) {
  const totalDays = dayDiffByIsoDates(fromIso, toIsoExclusive);
  if (!totalDays || !Number.isFinite(targetJsDay)) return 0;
  const fromWeekday = new Date(`${fromIso}T00:00:00.000Z`).getUTCDay();
  const delta = (targetJsDay - fromWeekday + 7) % 7;
  if (delta >= totalDays) return 0;
  return 1 + Math.floor((totalDays - 1 - delta) / 7);
}

async function aggregateHolatStats({ baseWhere, range }) {
  const grouped = await prisma.davomat.groupBy({
    where: {
      ...baseWhere,
      sana: { gte: range.from, lt: range.to },
    },
    by: ["holat"],
    _count: { _all: true },
  });
  const counts = normalizeHolatCounts(grouped);
  const total = HOLAT_KEYS.reduce((acc, key) => acc + Number(counts[key] || 0), 0);
  return { counts, total, foiz: calcFoizFromCounts(total, counts) };
}

function buildAdminAttendanceFilterSql({ selectedRange, classroomId, studentId, holat }) {
  return Prisma.sql`
    d.sana >= ${selectedRange.from}
    AND d.sana < ${selectedRange.to}
    ${studentId ? Prisma.sql`AND d."studentId" = ${studentId}` : Prisma.empty}
    ${classroomId ? Prisma.sql`AND dj."sinfId" = ${classroomId}` : Prisma.empty}
    ${holat ? Prisma.sql`AND d.holat = ${holat}` : Prisma.empty}
  `;
}

async function fetchAdminSessionPage({
  selectedRange,
  classroomId,
  studentId,
  holat,
  page = 1,
  limit = 20,
  includeAllHistory = false,
}) {
  const safePage = Math.max(1, Number.parseInt(String(page ?? 1), 10) || 1);
  const safeLimit = Math.min(
    Math.max(1, Number.parseInt(String(limit ?? 20), 10) || 20),
    200,
  );
  const offset = (safePage - 1) * safeLimit;
  const filterSql = buildAdminAttendanceFilterSql({
    selectedRange,
    classroomId,
    studentId,
    holat,
  });

  if (includeAllHistory) {
    const rows = await prisma.$queryRaw`
      SELECT
        d."darsJadvaliId",
        d.sana,
        COUNT(*)::int AS "jami"
      FROM "Davomat" d
      JOIN "DarsJadvali" dj ON dj.id = d."darsJadvaliId"
      WHERE ${filterSql}
      GROUP BY d."darsJadvaliId", d.sana
      ORDER BY d.sana DESC, d."darsJadvaliId" ASC
    `;
    return {
      sessions: rows,
      total: rows.length,
      page: 1,
      limit: rows.length || 1,
      pages: 1,
    };
  }

  const [countRows, pagedRows] = await prisma.$transaction([
    prisma.$queryRaw`
      SELECT COUNT(*)::int AS "count"
      FROM (
        SELECT DISTINCT d."darsJadvaliId", d.sana
        FROM "Davomat" d
        JOIN "DarsJadvali" dj ON dj.id = d."darsJadvaliId"
        WHERE ${filterSql}
      ) grouped
    `,
    prisma.$queryRaw`
      SELECT
        d."darsJadvaliId",
        d.sana,
        COUNT(*)::int AS "jami"
      FROM "Davomat" d
      JOIN "DarsJadvali" dj ON dj.id = d."darsJadvaliId"
      WHERE ${filterSql}
      GROUP BY d."darsJadvaliId", d.sana
      ORDER BY d.sana DESC, d."darsJadvaliId" ASC
      LIMIT ${safeLimit} OFFSET ${offset}
    `,
  ]);

  const total = Number(countRows?.[0]?.count || 0);
  return {
    sessions: pagedRows,
    total,
    page: safePage,
    limit: safeLimit,
    pages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

async function fetchAdminSessionDetails({
  sessions,
  classroomId,
  studentId,
  holat,
}) {
  if (!sessions?.length) return [];
  const sessionOrWhere = sessions.map((row) => ({
    darsJadvaliId: row.darsJadvaliId,
    sana: row.sana,
  }));
  const baseWhere = buildBaseWhere({ classroomId, studentId, holat });
  const [sessionHolatRows, darslar] = await prisma.$transaction([
    prisma.davomat.groupBy({
      where: {
        ...baseWhere,
        OR: sessionOrWhere,
      },
      by: ["darsJadvaliId", "sana", "holat"],
      _count: { _all: true },
    }),
    prisma.darsJadvali.findMany({
      where: {
        id: { in: [...new Set(sessions.map((row) => row.darsJadvaliId))] },
      },
      select: {
        id: true,
        sinf: { select: { id: true, name: true, academicYear: true } },
        fan: { select: { name: true } },
        oqituvchi: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const darsMap = new Map(darslar.map((row) => [row.id, row]));
  const holatMap = new Map();
  for (const row of sessionHolatRows) {
    const key = `${row.darsJadvaliId}__${toIsoDate(row.sana)}`;
    if (!holatMap.has(key)) {
      holatMap.set(key, { KELDI: 0, KECHIKDI: 0, SABABLI: 0, SABABSIZ: 0 });
    }
    holatMap.get(key)[row.holat] = row._count?._all || 0;
  }

  return sessions.map((row) => {
    const sanaKey = toIsoDate(row.sana);
    const dars = darsMap.get(row.darsJadvaliId);
    const holatlar = holatMap.get(`${row.darsJadvaliId}__${sanaKey}`) || {
      KELDI: 0,
      KECHIKDI: 0,
      SABABLI: 0,
      SABABSIZ: 0,
    };
    return {
      darsJadvaliId: row.darsJadvaliId,
      sana: utcDateToTashkentIsoDate(row.sana),
      sinf: dars?.sinf
        ? `${dars.sinf.name} (${dars.sinf.academicYear})`
        : "-",
      fan: dars?.fan?.name || "-",
      oqituvchi: dars?.oqituvchi
        ? `${dars.oqituvchi.firstName} ${dars.oqituvchi.lastName}`
        : "-",
      holatlar,
      jami: Number(row.jami || 0),
    };
  });
}

async function estimateExpectedAttendanceTotals({
  selectedRange,
  classroomId,
  studentId,
}) {
  let scopedClassroomId = classroomId || null;
  let forceSingleStudent = false;

  if (studentId) {
    const studentEnrollment = await prisma.enrollment.findFirst({
      where: { studentId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { classroomId: true },
    });
    if (!studentEnrollment?.classroomId) {
      return { expectedSessions: 0, expectedRecords: 0 };
    }
    if (scopedClassroomId && scopedClassroomId !== studentEnrollment.classroomId) {
      return { expectedSessions: 0, expectedRecords: 0 };
    }
    scopedClassroomId = studentEnrollment.classroomId;
    forceSingleStudent = true;
  }

  const darsRows = await prisma.darsJadvali.findMany({
    where: {
      ...(scopedClassroomId ? { sinfId: scopedClassroomId } : {}),
    },
    select: {
      sinfId: true,
      haftaKuni: true,
    },
  });
  if (!darsRows.length) return { expectedSessions: 0, expectedRecords: 0 };

  const classroomIds = [...new Set(darsRows.map((row) => row.sinfId))];
  let classroomSizeById = new Map();
  if (forceSingleStudent) {
    classroomSizeById = new Map(classroomIds.map((id) => [id, 1]));
  } else {
    const enrollmentCounts = await prisma.enrollment.groupBy({
      by: ["classroomId"],
      where: { isActive: true, classroomId: { in: classroomIds } },
      _count: { _all: true },
    });
    classroomSizeById = new Map(
      enrollmentCounts.map((row) => [row.classroomId, Number(row._count?._all || 0)]),
    );
  }

  const { from: fromIso, toExclusive: toIsoExclusive } = toIsoRange(selectedRange);
  let expectedSessions = 0;
  let expectedRecords = 0;
  for (const row of darsRows) {
    const jsDay = HAFTA_KUNI_TO_JS_DAY[row.haftaKuni];
    if (!jsDay) continue;
    const sessionCount = countWeekdayOccurrencesInRange(
      fromIso,
      toIsoExclusive,
      jsDay,
    );
    if (!sessionCount) continue;
    const classSize = Number(classroomSizeById.get(row.sinfId) || 0);
    expectedSessions += sessionCount;
    expectedRecords += sessionCount * classSize;
  }

  return { expectedSessions, expectedRecords };
}

async function buildAdminRiskSummary({
  selectedRange,
  classroomId,
  studentId,
}) {
  const filterSql = Prisma.sql`
    d.sana >= ${selectedRange.from}
    AND d.sana < ${selectedRange.to}
    AND d.holat = ${"SABABSIZ"}
    ${studentId ? Prisma.sql`AND d."studentId" = ${studentId}` : Prisma.empty}
    ${classroomId ? Prisma.sql`AND dj."sinfId" = ${classroomId}` : Prisma.empty}
  `;

  const [topStudentRows, topTeacherRows, topClassroomRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT d."studentId" AS id, COUNT(*)::int AS count
      FROM "Davomat" d
      JOIN "DarsJadvali" dj ON dj.id = d."darsJadvaliId"
      WHERE ${filterSql}
      GROUP BY d."studentId"
      ORDER BY COUNT(*) DESC, d."studentId" ASC
      LIMIT 5
    `,
    prisma.$queryRaw`
      SELECT d."belgilaganTeacherId" AS id, COUNT(*)::int AS count
      FROM "Davomat" d
      JOIN "DarsJadvali" dj ON dj.id = d."darsJadvaliId"
      WHERE ${filterSql}
      GROUP BY d."belgilaganTeacherId"
      ORDER BY COUNT(*) DESC, d."belgilaganTeacherId" ASC
      LIMIT 5
    `,
    prisma.$queryRaw`
      SELECT
        dj."sinfId" AS id,
        c.name AS "classroomName",
        c."academicYear" AS "academicYear",
        COUNT(*)::int AS count
      FROM "Davomat" d
      JOIN "DarsJadvali" dj ON dj.id = d."darsJadvaliId"
      JOIN "Classroom" c ON c.id = dj."sinfId"
      WHERE ${filterSql}
      GROUP BY dj."sinfId", c.name, c."academicYear"
      ORDER BY COUNT(*) DESC, dj."sinfId" ASC
      LIMIT 5
    `,
  ]);

  const studentIds = topStudentRows.map((row) => row.id);
  const teacherIds = topTeacherRows.map((row) => row.id);
  const [studentProfiles, teacherProfiles] = await Promise.all([
    studentIds.length
      ? prisma.student.findMany({
          where: { id: { in: studentIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { username: true } },
          },
        })
      : [],
    teacherIds.length
      ? prisma.teacher.findMany({
          where: { id: { in: teacherIds } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            user: { select: { username: true } },
          },
        })
      : [],
  ]);
  const studentMap = new Map(studentProfiles.map((row) => [row.id, row]));
  const teacherMap = new Map(teacherProfiles.map((row) => [row.id, row]));

  return {
    topSababsizStudents: topStudentRows.map((row) => {
      const profile = studentMap.get(row.id);
      const fullName = profile
        ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
        : "-";
      return {
        studentId: row.id,
        fullName: fullName || profile?.user?.username || row.id,
        username: profile?.user?.username || "",
        count: Number(row.count || 0),
      };
    }),
    topSababsizTeachers: topTeacherRows.map((row) => {
      const profile = teacherMap.get(row.id);
      const fullName = profile
        ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
        : "-";
      return {
        teacherId: row.id,
        fullName: fullName || profile?.user?.username || row.id,
        username: profile?.user?.username || "",
        count: Number(row.count || 0),
      };
    }),
    topSababsizClassrooms: topClassroomRows.map((row) => ({
      classroomId: row.id,
      classroom:
        row.classroomName && row.academicYear
          ? `${row.classroomName} (${row.academicYear})`
          : row.classroomName || "-",
      count: Number(row.count || 0),
    })),
  };
}

async function getAdminAttendanceReportCore(query = {}, options = {}) {
  const { sana, sanaStr } = parseSanaOrToday(query.sana);
  const { classroomId, studentId, holat } = query;
  const selectedRange = buildRangeByType(query.periodType, sana);
  const ranges = buildAllRanges(sana);
  const baseWhere = buildBaseWhere({ classroomId, studentId, holat });
  const includeAllHistory = Boolean(options.includeAllHistory);

  const [
    kunlikStats,
    haftalikStats,
    oylikStats,
    choraklikStats,
    yillikStats,
    selectedStats,
    selectedRecordsCount,
    sessionPage,
    expectedTotals,
    risk,
  ] = await Promise.all([
    aggregateHolatStats({ baseWhere, range: ranges.kunlik }),
    aggregateHolatStats({ baseWhere, range: ranges.haftalik }),
    aggregateHolatStats({ baseWhere, range: ranges.oylik }),
    aggregateHolatStats({ baseWhere, range: ranges.choraklik }),
    aggregateHolatStats({ baseWhere, range: ranges.yillik }),
    aggregateHolatStats({ baseWhere, range: selectedRange }),
    prisma.davomat.count({
      where: {
        ...baseWhere,
        sana: { gte: selectedRange.from, lt: selectedRange.to },
      },
    }),
    fetchAdminSessionPage({
      selectedRange,
      classroomId,
      studentId,
      holat,
      page: query.page,
      limit: query.limit,
      includeAllHistory,
    }),
    estimateExpectedAttendanceTotals({
      selectedRange,
      classroomId,
      studentId,
    }),
    buildAdminRiskSummary({
      selectedRange,
      classroomId,
      studentId,
    }),
  ]);

  const tarix = await fetchAdminSessionDetails({
    sessions: sessionPage.sessions,
    classroomId,
    studentId,
    holat,
  });
  const presentSelectedCount =
    Number(selectedStats.counts.KELDI || 0) +
    Number(selectedStats.counts.KECHIKDI || 0);
  const expectedRecords = Number(expectedTotals.expectedRecords || 0);
  const expectedSessions = Number(expectedTotals.expectedSessions || 0);
  const coverageRate = expectedRecords
    ? Number(((Number(selectedRecordsCount || 0) / expectedRecords) * 100).toFixed(1))
    : 0;
  const attendanceRateByExpected = expectedRecords
    ? Number(((presentSelectedCount / expectedRecords) * 100).toFixed(1))
    : 0;
  const unmarkedCount = Math.max(0, expectedRecords - Number(selectedRecordsCount || 0));
  const sessionCoverageRate = expectedSessions
    ? Number(((Number(sessionPage.total || 0) / expectedSessions) * 100).toFixed(1))
    : 0;

  return {
    sanaStr,
    selectedRange,
    selectedRecordsCount: Number(selectedRecordsCount || 0),
    tarix,
    tarixTotal: Number(sessionPage.total || 0),
    page: Number(sessionPage.page || 1),
    limit: Number(sessionPage.limit || 20),
    pages: Number(sessionPage.pages || 1),
    foizlar: {
      kunlik: kunlikStats.foiz,
      haftalik: haftalikStats.foiz,
      oylik: oylikStats.foiz,
      choraklik: choraklikStats.foiz,
      yillik: yillikStats.foiz,
      tanlanganPeriod: selectedStats.foiz,
      tanlanganPeriodByExpected: attendanceRateByExpected,
      coverage: coverageRate,
      sessionCoverage: sessionCoverageRate,
    },
    holatlar: {
      tanlanganPeriod: selectedStats.counts,
      kunlik: kunlikStats.counts,
      haftalik: haftalikStats.counts,
      oylik: oylikStats.counts,
      choraklik: choraklikStats.counts,
      yillik: yillikStats.counts,
    },
    expected: {
      records: expectedRecords,
      sessions: expectedSessions,
      unmarkedRecords: unmarkedCount,
    },
    risk,
  };
}

async function getAdminAttendanceReportData(query = {}) {
  const core = await getAdminAttendanceReportCore(query);
  const { selectedRange } = core;

  return {
    ok: true,
    sana: core.sanaStr,
    periodType: selectedRange.type,
    period: {
      from: toIsoDate(selectedRange.from),
      to: toIsoDate(new Date(selectedRange.to.getTime() - 1)),
    },
    page: core.page,
    limit: core.limit,
    total: core.tarixTotal,
    pages: core.pages,
    foizlar: core.foizlar,
    holatlar: core.holatlar,
    tarix: core.tarix,
    expected: core.expected,
    risk: core.risk,
    jami: {
      tanlanganPeriodDavomatYozuvlari: core.selectedRecordsCount,
      tanlanganPeriodDarsSessiyalari: core.tarixTotal,
      tanlanganPeriodRejadagiYozuvlar: core.expected.records,
      tanlanganPeriodRejadagiDarsSessiyalari: core.expected.sessions,
      belgilanmaganYozuvlar: core.expected.unmarkedRecords,
    },
  };
}

async function getTeacherAttendanceHistoryByUserId({ userId, query = {} }) {
  const { sana, sanaStr } = parseSanaOrToday(query.sana);
  const { classroomId, holat } = query;
  const period = buildRangeByType(query.periodType, sana);
  const page = parseIntSafe(query.page, 1);
  const limit = Math.min(parseIntSafe(query.limit, 20), 100);
  const skip = (page - 1) * limit;

  const teacher = await getTeacherAttendanceScopeByUserId(userId);

  const baseWhere = {
    sana: { gte: period.from, lt: period.to },
    holat: holat || undefined,
    darsJadvali: {
      oqituvchiId: teacher.id,
      ...(classroomId ? { sinfId: classroomId } : {}),
    },
  };

  const [allSessionKeys, pagedSessions, totalDavomatYozuvlari] =
    await prisma.$transaction([
      prisma.davomat.groupBy({
        where: baseWhere,
        by: ["darsJadvaliId", "sana"],
      }),
      prisma.davomat.groupBy({
        where: baseWhere,
        by: ["darsJadvaliId", "sana"],
        _count: { _all: true },
        orderBy: [{ sana: "desc" }, { darsJadvaliId: "asc" }],
        skip,
        take: limit,
      }),
      prisma.davomat.count({ where: baseWhere }),
    ]);

  const totalSessions = allSessionKeys.length;
  const pages = Math.ceil(totalSessions / limit);

  if (!pagedSessions.length) {
    return {
      ok: true,
      sana: sanaStr,
      periodType: period.type,
      page,
      limit,
      total: totalSessions,
      pages,
      period: {
        from: toIsoDate(period.from),
        to: toIsoDate(new Date(period.to.getTime() - 1)),
      },
      tarix: [],
      jami: {
        davomatYozuvlari: totalDavomatYozuvlari,
        darsSessiyalari: totalSessions,
      },
    };
  }

  const sessionOrWhere = pagedSessions.map((row) => ({
    darsJadvaliId: row.darsJadvaliId,
    sana: row.sana,
  }));

  const [sessionHolatRows, darslar] = await prisma.$transaction([
    prisma.davomat.groupBy({
      where: {
        ...baseWhere,
        OR: sessionOrWhere,
      },
      by: ["darsJadvaliId", "sana", "holat"],
      _count: { _all: true },
    }),
    prisma.darsJadvali.findMany({
      where: {
        id: { in: [...new Set(pagedSessions.map((row) => row.darsJadvaliId))] },
      },
      select: {
        id: true,
        sinf: { select: { id: true, name: true, academicYear: true } },
        fan: { select: { name: true } },
        vaqtOraliq: { select: { nomi: true, boshlanishVaqti: true } },
      },
    }),
  ]);

  const darsMap = new Map(darslar.map((row) => [row.id, row]));
  const holatMap = new Map();
  for (const row of sessionHolatRows) {
    const key = `${row.darsJadvaliId}__${toIsoDate(row.sana)}`;
    if (!holatMap.has(key)) {
      holatMap.set(key, { KELDI: 0, KECHIKDI: 0, SABABLI: 0, SABABSIZ: 0 });
    }
    holatMap.get(key)[row.holat] = row._count?._all || 0;
  }

  const tarix = pagedSessions.map((row) => {
    const sanaKey = toIsoDate(row.sana);
    const dars = darsMap.get(row.darsJadvaliId);
    const holatlar = holatMap.get(`${row.darsJadvaliId}__${sanaKey}`) || {
      KELDI: 0,
      KECHIKDI: 0,
      SABABLI: 0,
      SABABSIZ: 0,
    };
    return {
      darsJadvaliId: row.darsJadvaliId,
      sana: sanaKey,
      sinf: dars?.sinf
        ? `${dars.sinf.name} (${dars.sinf.academicYear})`
        : "-",
      fan: dars?.fan?.name || "-",
      vaqtOraliq: dars?.vaqtOraliq
        ? `${dars.vaqtOraliq.nomi} (${dars.vaqtOraliq.boshlanishVaqti})`
        : "-",
      holatlar,
      jami: row._count?._all || 0,
    };
  });

  return {
    ok: true,
    sana: sanaStr,
    periodType: period.type,
    page,
    limit,
    total: totalSessions,
    pages,
    period: {
      from: toIsoDate(period.from),
      to: toIsoDate(new Date(period.to.getTime() - 1)),
    },
    tarix,
    jami: {
      davomatYozuvlari: totalDavomatYozuvlari,
      darsSessiyalari: totalSessions,
    },
  };
}

function pickPrimaryBaho(baholar) {
  if (!baholar?.length) return null;
  return baholar.find((item) => item.turi === "JORIY") || baholar[0];
}

async function getStudentAttendanceByUserId({ userId, query = {} }) {
  const { sana, sanaStr } = parseSanaOrToday(query.sana);
  const period = buildRangeByType(query.periodType, sana);
  const page = parseIntSafe(query.page, 1);
  const limit = Math.min(parseIntSafe(query.limit, 20), 100);
  const skip = (page - 1) * limit;

  const student = await getStudentAttendanceScopeByUserId(userId);

  const where = {
    studentId: student.id,
    ...(query.holat ? { holat: query.holat } : {}),
    sana: { gte: period.from, lt: period.to },
  };

  const [total, records, groupedByHolat] = await prisma.$transaction([
    prisma.davomat.count({ where }),
    prisma.davomat.findMany({
      where,
      skip,
      take: limit,
      include: {
        darsJadvali: {
          select: {
            id: true,
            fan: { select: { name: true } },
            sinf: { select: { name: true, academicYear: true } },
            vaqtOraliq: { select: { nomi: true, boshlanishVaqti: true } },
            oqituvchi: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [
        { sana: "desc" },
        { darsJadvali: { vaqtOraliq: { tartib: "asc" } } },
      ],
    }),
    prisma.davomat.groupBy({
      where,
      by: ["holat"],
      _count: { _all: true },
    }),
  ]);

  let baholar = [];
  if (records.length) {
    const darsJadvaliIds = [...new Set(records.map((row) => row.darsJadvaliId))];
    const sanaTimestamps = records.map((row) => row.sana.getTime());
    const minSana = new Date(Math.min(...sanaTimestamps));
    const maxSana = new Date(Math.max(...sanaTimestamps));

    baholar = await prisma.baho.findMany({
      where: {
        studentId: student.id,
        darsJadvaliId: { in: darsJadvaliIds },
        sana: { gte: minSana, lte: maxSana },
      },
      select: {
        darsJadvaliId: true,
        sana: true,
        turi: true,
        ball: true,
        maxBall: true,
        izoh: true,
      },
    });
  }

  const holatlar = normalizeHolatCounts(groupedByHolat);
  const foiz = calcFoizFromCounts(total, holatlar);
  const bahoMap = new Map();

  for (const item of baholar) {
    const key = `${item.darsJadvaliId}__${toIsoDate(item.sana)}`;
    if (!bahoMap.has(key)) bahoMap.set(key, []);
    bahoMap.get(key).push(item);
  }

  const tarix = records.map((row) => {
    const relatedBaholar =
      bahoMap.get(`${row.darsJadvaliId}__${toIsoDate(row.sana)}`) || [];
    const baho = pickPrimaryBaho(relatedBaholar);
    return {
      id: row.id,
      sana: toIsoDate(row.sana),
      holat: row.holat,
      izoh: row.izoh || "",
      bahoBall: baho?.ball ?? null,
      bahoMaxBall: baho?.maxBall ?? null,
      bahoTuri: baho?.turi ?? null,
      bahoIzoh: baho?.izoh || "",
      fan: row.darsJadvali?.fan?.name || "-",
      sinf: row.darsJadvali?.sinf
        ? `${row.darsJadvali.sinf.name} (${row.darsJadvali.sinf.academicYear})`
        : "-",
      vaqt: row.darsJadvali?.vaqtOraliq
        ? `${row.darsJadvali.vaqtOraliq.nomi} (${row.darsJadvali.vaqtOraliq.boshlanishVaqti})`
        : "-",
      oqituvchi: row.darsJadvali?.oqituvchi
        ? `${row.darsJadvali.oqituvchi.firstName} ${row.darsJadvali.oqituvchi.lastName}`
        : "-",
    };
  });

  return {
    ok: true,
    sana: sanaStr,
    periodType: period.type,
    holat: query.holat || null,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    period: {
      from: toIsoDate(period.from),
      to: toIsoDate(new Date(period.to.getTime() - 1)),
    },
    student: {
      id: student.id,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
      classroom: student.enrollments?.[0]?.classroom
        ? `${student.enrollments[0].classroom.name} (${student.enrollments[0].classroom.academicYear})`
        : null,
    },
    statistika: {
      jami: total,
      foiz,
      holatlar,
    },
    tarix,
  };
}

module.exports = {
  getAdminAttendanceReportCore,
  getAdminAttendanceReportData,
  getTeacherAttendanceHistoryByUserId,
  getStudentAttendanceByUserId,
  getTeacherAttendanceScopeByUserId,
};
