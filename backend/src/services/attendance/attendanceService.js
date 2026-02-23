const prisma = require("../../prisma");
const {
  parseSanaOrToday,
  buildRangeByType,
  buildAllRanges,
} = require("../../utils/attendancePeriod");
const { utcDateToTashkentIsoDate } = require("../../utils/tashkentTime");
const {
  parseIntSafe,
  toIsoDate,
  normalizeHolatCounts,
  calcFoizFromCounts,
  calcFoiz,
  getTeacherAttendanceScopeByUserId,
  getStudentAttendanceScopeByUserId,
} = require("./attendanceScope");

function buildBaseWhere({ classroomId, studentId }) {
  return {
    ...(studentId ? { studentId } : {}),
    ...(classroomId ? { darsJadvali: { sinfId: classroomId } } : {}),
  };
}

function groupAdminSessions(records) {
  const sessionMap = new Map();
  for (const row of records) {
    const sanaKey = utcDateToTashkentIsoDate(row.sana);
    const key = `${row.darsJadvaliId}__${sanaKey}`;
    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        darsJadvaliId: row.darsJadvaliId,
        sana: sanaKey,
        sinf: row.darsJadvali?.sinf
          ? `${row.darsJadvali.sinf.name} (${row.darsJadvali.sinf.academicYear})`
          : "-",
        fan: row.darsJadvali?.fan?.name || "-",
        oqituvchi: row.darsJadvali?.oqituvchi
          ? `${row.darsJadvali.oqituvchi.firstName} ${row.darsJadvali.oqituvchi.lastName}`
          : "-",
        holatlar: { KELDI: 0, KECHIKDI: 0, SABABLI: 0, SABABSIZ: 0 },
        jami: 0,
      });
    }
    const session = sessionMap.get(key);
    session.jami += 1;
    session.holatlar[row.holat] += 1;
  }

  return [...sessionMap.values()].sort((a, b) => {
    if (a.sana === b.sana) return a.sinf.localeCompare(b.sinf, "uz");
    return a.sana < b.sana ? 1 : -1;
  });
}

async function fetchAdminSelectedRecords(baseWhere, selectedRange) {
  return prisma.davomat.findMany({
    where: {
      ...baseWhere,
      sana: { gte: selectedRange.from, lt: selectedRange.to },
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      darsJadvali: {
        select: {
          id: true,
          sinf: { select: { id: true, name: true, academicYear: true } },
          fan: { select: { name: true } },
          oqituvchi: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
}

async function getAdminAttendanceReportCore(query = {}) {
  const { sana, sanaStr } = parseSanaOrToday(query.sana);
  const { classroomId, studentId } = query;
  const selectedRange = buildRangeByType(query.periodType, sana);
  const ranges = buildAllRanges(sana);
  const baseWhere = buildBaseWhere({ classroomId, studentId });

  const [
    kunlikRecords,
    haftalikRecords,
    oylikRecords,
    choraklikRecords,
    yillikRecords,
    selectedRecords,
  ] = await Promise.all([
    prisma.davomat.findMany({
      where: {
        ...baseWhere,
        sana: { gte: ranges.kunlik.from, lt: ranges.kunlik.to },
      },
      select: { holat: true },
    }),
    prisma.davomat.findMany({
      where: {
        ...baseWhere,
        sana: { gte: ranges.haftalik.from, lt: ranges.haftalik.to },
      },
      select: { holat: true },
    }),
    prisma.davomat.findMany({
      where: {
        ...baseWhere,
        sana: { gte: ranges.oylik.from, lt: ranges.oylik.to },
      },
      select: { holat: true },
    }),
    prisma.davomat.findMany({
      where: {
        ...baseWhere,
        sana: { gte: ranges.choraklik.from, lt: ranges.choraklik.to },
      },
      select: { holat: true },
    }),
    prisma.davomat.findMany({
      where: {
        ...baseWhere,
        sana: { gte: ranges.yillik.from, lt: ranges.yillik.to },
      },
      select: { holat: true },
    }),
    fetchAdminSelectedRecords(baseWhere, selectedRange),
  ]);

  const tarix = groupAdminSessions(selectedRecords);

  return {
    sanaStr,
    selectedRange,
    selectedRecords,
    tarix,
    foizlar: {
      kunlik: calcFoiz(kunlikRecords),
      haftalik: calcFoiz(haftalikRecords),
      oylik: calcFoiz(oylikRecords),
      choraklik: calcFoiz(choraklikRecords),
      yillik: calcFoiz(yillikRecords),
      tanlanganPeriod: calcFoiz(selectedRecords),
    },
  };
}

async function getAdminAttendanceReportData(query = {}) {
  const core = await getAdminAttendanceReportCore(query);
  const { selectedRange, selectedRecords, tarix } = core;

  return {
    ok: true,
    sana: core.sanaStr,
    periodType: selectedRange.type,
    period: {
      from: toIsoDate(selectedRange.from),
      to: toIsoDate(new Date(selectedRange.to.getTime() - 1)),
    },
    foizlar: core.foizlar,
    tarix,
    jami: {
      tanlanganPeriodDavomatYozuvlari: selectedRecords.length,
      tanlanganPeriodDarsSessiyalari: tarix.length,
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
