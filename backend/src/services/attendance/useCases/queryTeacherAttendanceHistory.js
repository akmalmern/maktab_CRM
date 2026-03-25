async function executeGetTeacherAttendanceHistoryByUserId({ deps, userId, query = {} }) {
  const {
    prisma,
    parseSanaOrToday,
    buildRangeByType,
    parseIntSafe,
    toIsoDate,
    getTeacherAttendanceScopeByUserId,
  } = deps;

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

  const [allSessionKeys, pagedSessions, totalDavomatYozuvlari] = await prisma.$transaction([
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
      sinf: dars?.sinf ? `${dars.sinf.name} (${dars.sinf.academicYear})` : "-",
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

module.exports = {
  executeGetTeacherAttendanceHistoryByUserId,
};
