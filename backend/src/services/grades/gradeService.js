const prisma = require("../../prisma");
const {
  toIsoDate,
  buildSanaFilterFromQuery,
  buildPaging,
  getTeacherByUserId,
  getStudentByUserId,
  getStudentActiveClassroomByUserId,
} = require("./gradeScope");

function buildWeightedStats(rows = []) {
  const stats = {
    JORIY: { count: 0, avg: 0 },
    NAZORAT: { count: 0, avg: 0 },
    ORALIQ: { count: 0, avg: 0 },
    YAKUNIY: { count: 0, avg: 0 },
  };

  for (const row of rows) {
    const key = row.turi;
    if (!stats[key]) continue;
    const count = row?._count?._all ?? 0;
    const sumBall = row?._sum?.ball ?? 0;
    const sumMaxBall = row?._sum?.maxBall ?? 0;
    stats[key].count = count;
    stats[key].avg =
      sumMaxBall > 0 ? Number(((sumBall / sumMaxBall) * 100).toFixed(1)) : 0;
  }

  return stats;
}

function fetchStatsAggregation(where) {
  return prisma.baho.groupBy({
    where,
    by: ["turi"],
    _count: { _all: true },
    _sum: { ball: true, maxBall: true },
  });
}

function buildBaseWhereFromQuery(query = {}) {
  const sana = buildSanaFilterFromQuery(query);
  return {
    ...(query.bahoTuri ? { turi: query.bahoTuri } : {}),
    ...(sana ? { sana } : {}),
  };
}

function toOneDecimal(value) {
  return Number(Number(value || 0).toFixed(1));
}

function toPercent(ball, maxBall) {
  if (!maxBall) return 0;
  return Number(((Number(ball || 0) / Number(maxBall || 1)) * 100).toFixed(1));
}

function mapCommonGradeRow(row) {
  return {
    id: row.id,
    sana: toIsoDate(row.sana),
    turi: row.turi,
    ball: row.ball,
    maxBall: row.maxBall,
    izoh: row.izoh || "",
  };
}

async function getTeacherGradesByUserId({ userId, query = {} }) {
  const teacher = await getTeacherByUserId(userId);
  const { page, limit, skip } = buildPaging(query);
  const darsJadvaliWhere = {
    ...(query.subjectId ? { fanId: query.subjectId } : {}),
    ...(query.classroomId ? { sinfId: query.classroomId } : {}),
  };

  const where = {
    ...buildBaseWhereFromQuery(query),
    teacherId: teacher.id,
    ...(query.studentId ? { studentId: query.studentId } : {}),
    ...(Object.keys(darsJadvaliWhere).length
      ? { darsJadvali: { is: darsJadvaliWhere } }
      : {}),
  };

  const [items, total, statsAggregation] = await prisma.$transaction([
    prisma.baho.findMany({
      where,
      skip,
      take: limit,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        darsJadvali: {
          select: {
            id: true,
            sinf: { select: { id: true, name: true, academicYear: true } },
            fan: { select: { id: true, name: true } },
            vaqtOraliq: {
              select: { id: true, nomi: true, boshlanishVaqti: true },
            },
          },
        },
      },
      orderBy: [{ sana: "desc" }, { createdAt: "desc" }],
    }),
    prisma.baho.count({ where }),
    fetchStatsAggregation(where),
  ]);

  return {
    teacher,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    stats: buildWeightedStats(statsAggregation),
    baholar: items.map((row) => ({
      ...mapCommonGradeRow(row),
      student: row.student ? `${row.student.firstName} ${row.student.lastName}` : "-",
      fan: row.darsJadvali?.fan?.name || "-",
      sinf: row.darsJadvali?.sinf
        ? `${row.darsJadvali.sinf.name} (${row.darsJadvali.sinf.academicYear})`
        : "-",
      vaqt: row.darsJadvali?.vaqtOraliq
        ? `${row.darsJadvali.vaqtOraliq.nomi} (${row.darsJadvali.vaqtOraliq.boshlanishVaqti})`
        : "-",
    })),
  };
}

async function getStudentOwnGradesByUserId({ userId, query = {} }) {
  const student = await getStudentByUserId(userId);
  const { page, limit, skip } = buildPaging(query);
  const darsJadvaliWhere = {
    ...(query.subjectId ? { fanId: query.subjectId } : {}),
  };

  const where = {
    ...buildBaseWhereFromQuery(query),
    studentId: student.id,
    ...(Object.keys(darsJadvaliWhere).length
      ? { darsJadvali: { is: darsJadvaliWhere } }
      : {}),
  };

  const [items, total, statsAggregation] = await prisma.$transaction([
    prisma.baho.findMany({
      where,
      skip,
      take: limit,
      include: {
        teacher: { select: { firstName: true, lastName: true } },
        darsJadvali: {
          select: {
            sinf: { select: { name: true, academicYear: true } },
            fan: { select: { name: true } },
            vaqtOraliq: { select: { nomi: true, boshlanishVaqti: true } },
          },
        },
      },
      orderBy: [{ sana: "desc" }, { createdAt: "desc" }],
    }),
    prisma.baho.count({ where }),
    fetchStatsAggregation(where),
  ]);

  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    stats: buildWeightedStats(statsAggregation),
    baholar: items.map((row) => ({
      ...mapCommonGradeRow(row),
      fan: row.darsJadvali?.fan?.name || "-",
      sinf: row.darsJadvali?.sinf
        ? `${row.darsJadvali.sinf.name} (${row.darsJadvali.sinf.academicYear})`
        : "-",
      vaqt: row.darsJadvali?.vaqtOraliq
        ? `${row.darsJadvali.vaqtOraliq.nomi} (${row.darsJadvali.vaqtOraliq.boshlanishVaqti})`
        : "-",
      oqituvchi: row.teacher ? `${row.teacher.firstName} ${row.teacher.lastName}` : "-",
    })),
  };
}

async function getStudentClassGradesByUserId({ userId, query = {} }) {
  const { classroom } = await getStudentActiveClassroomByUserId(userId);
  const { page, limit, skip } = buildPaging(query);

  const where = {
    ...buildBaseWhereFromQuery(query),
    darsJadvali: {
      is: {
        sinfId: classroom.id,
        ...(query.subjectId ? { fanId: query.subjectId } : {}),
      },
    },
  };

  const [grouped, statsAggregation] = await prisma.$transaction([
    prisma.baho.groupBy({
      by: ["sana", "turi", "darsJadvaliId", "teacherId"],
      where,
      orderBy: [{ sana: "desc" }],
      _count: { _all: true },
      _avg: { ball: true, maxBall: true },
      _min: { ball: true },
      _max: { ball: true },
    }),
    fetchStatsAggregation(where),
  ]);

  const total = grouped.length;
  const pages = Math.ceil(total / limit);
  const pagedGroups = grouped.slice(skip, skip + limit);

  const darsJadvaliIds = [...new Set(pagedGroups.map((row) => row.darsJadvaliId).filter(Boolean))];
  const teacherIds = [...new Set(pagedGroups.map((row) => row.teacherId).filter(Boolean))];

  const [darslar, oqituvchilar] = await prisma.$transaction([
    prisma.darsJadvali.findMany({
      where: { id: { in: darsJadvaliIds } },
      select: {
        id: true,
        fan: { select: { name: true } },
        vaqtOraliq: { select: { nomi: true, boshlanishVaqti: true } },
      },
    }),
    prisma.teacher.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const darsMap = new Map(darslar.map((row) => [row.id, row]));
  const teacherMap = new Map(oqituvchilar.map((row) => [row.id, row]));

  return {
    page,
    limit,
    total,
    pages,
    classroom: `${classroom.name} (${classroom.academicYear})`,
    isAnonymized: true,
    stats: buildWeightedStats(statsAggregation),
    baholar: pagedGroups.map((row) => {
      const dars = darsMap.get(row.darsJadvaliId);
      const teacher = teacherMap.get(row.teacherId);
      const avgBall = toOneDecimal(row._avg?.ball);
      const avgMaxBall = toOneDecimal(row._avg?.maxBall);

      return {
        id: `${row.darsJadvaliId}-${toIsoDate(row.sana)}-${row.turi}`,
        sana: toIsoDate(row.sana),
        turi: row.turi,
        yozuvlarSoni: row._count?._all || 0,
        ortachaBall: avgBall,
        ortachaMaxBall: avgMaxBall,
        ortachaFoiz: toPercent(avgBall, avgMaxBall),
        minBall: Number(row._min?.ball || 0),
        maxBall: Number(row._max?.ball || 0),
        fan: dars?.fan?.name || "-",
        vaqt: dars?.vaqtOraliq
          ? `${dars.vaqtOraliq.nomi} (${dars.vaqtOraliq.boshlanishVaqti})`
          : "-",
        oqituvchi: teacher ? `${teacher.firstName} ${teacher.lastName}` : "-",
      };
    }),
  };
}

async function getAdminGrades({ query = {} }) {
  const { page, limit, skip } = buildPaging(query);
  const darsJadvaliWhere = {
    ...(query.subjectId ? { fanId: query.subjectId } : {}),
    ...(query.classroomId ? { sinfId: query.classroomId } : {}),
  };

  const where = {
    ...buildBaseWhereFromQuery(query),
    ...(query.studentId ? { studentId: query.studentId } : {}),
    ...(query.teacherId ? { teacherId: query.teacherId } : {}),
    ...(Object.keys(darsJadvaliWhere).length
      ? { darsJadvali: { is: darsJadvaliWhere } }
      : {}),
  };

  const [items, total, statsAggregation] = await prisma.$transaction([
    prisma.baho.findMany({
      where,
      skip,
      take: limit,
      include: {
        student: { select: { firstName: true, lastName: true } },
        teacher: { select: { firstName: true, lastName: true } },
        darsJadvali: {
          select: {
            fan: { select: { name: true } },
            sinf: { select: { name: true, academicYear: true } },
          },
        },
      },
      orderBy: [{ sana: "desc" }, { createdAt: "desc" }],
    }),
    prisma.baho.count({ where }),
    fetchStatsAggregation(where),
  ]);

  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    stats: buildWeightedStats(statsAggregation),
    baholar: items.map((row) => ({
      ...mapCommonGradeRow(row),
      student: row.student ? `${row.student.firstName} ${row.student.lastName}` : "-",
      oqituvchi: row.teacher ? `${row.teacher.firstName} ${row.teacher.lastName}` : "-",
      fan: row.darsJadvali?.fan?.name || "-",
      sinf: row.darsJadvali?.sinf
        ? `${row.darsJadvali.sinf.name} (${row.darsJadvali.sinf.academicYear})`
        : "-",
    })),
  };
}

module.exports = {
  getTeacherGradesByUserId,
  getStudentOwnGradesByUserId,
  getStudentClassGradesByUserId,
  getAdminGrades,
};
