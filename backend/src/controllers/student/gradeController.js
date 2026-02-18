const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");

function parseIntSafe(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toIsoDate(value) {
  return value.toISOString().slice(0, 10);
}

function parseDateStart(value) {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00.000Z`);
}

function parseDateEnd(value) {
  if (!value) return undefined;
  return new Date(`${value}T23:59:59.999Z`);
}

function parseDayRange(sana) {
  if (!sana) return null;
  return {
    from: new Date(`${sana}T00:00:00.000Z`),
    to: new Date(`${sana}T23:59:59.999Z`),
  };
}

function buildStats(items) {
  const stats = {
    JORIY: { count: 0, avg: 0 },
    NAZORAT: { count: 0, avg: 0 },
    ORALIQ: { count: 0, avg: 0 },
    YAKUNIY: { count: 0, avg: 0 },
  };
  for (const item of items) {
    const key = item.turi;
    if (!stats[key]) continue;
    stats[key].count += 1;
    stats[key].avg += (item.ball / item.maxBall) * 100;
  }
  Object.keys(stats).forEach((key) => {
    if (!stats[key].count) return;
    stats[key].avg = Number((stats[key].avg / stats[key].count).toFixed(1));
  });
  return stats;
}

async function getStudentByUserId(userId) {
  return prisma.student.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true },
  });
}

async function getMyBaholar(req, res) {
  const student = await getStudentByUserId(req.user.sub);
  if (!student) {
    throw new ApiError(404, "STUDENT_TOPILMADI", "Student topilmadi");
  }

  const page = parseIntSafe(req.query.page, 1);
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;
  const dayRange = parseDayRange(req.query.sana);
  const sanaFrom = dayRange?.from || parseDateStart(req.query.sanaFrom);
  const sanaTo = dayRange?.to || parseDateEnd(req.query.sanaTo);

  const where = {
    studentId: student.id,
    ...(req.query.bahoTuri ? { turi: req.query.bahoTuri } : {}),
    ...(sanaFrom || sanaTo ? { sana: { ...(sanaFrom ? { gte: sanaFrom } : {}), ...(sanaTo ? { lte: sanaTo } : {}) } } : {}),
    darsJadvali: {
      ...(req.query.subjectId ? { fanId: req.query.subjectId } : {}),
    },
  };

  const [items, total, allForStats] = await prisma.$transaction([
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
    prisma.baho.findMany({ where, select: { turi: true, ball: true, maxBall: true } }),
  ]);

  res.json({
    ok: true,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    stats: buildStats(allForStats),
    baholar: items.map((row) => ({
      id: row.id,
      sana: toIsoDate(row.sana),
      turi: row.turi,
      ball: row.ball,
      maxBall: row.maxBall,
      izoh: row.izoh || "",
      fan: row.darsJadvali?.fan?.name || "-",
      sinf: row.darsJadvali?.sinf
        ? `${row.darsJadvali.sinf.name} (${row.darsJadvali.sinf.academicYear})`
        : "-",
      vaqt: row.darsJadvali?.vaqtOraliq
        ? `${row.darsJadvali.vaqtOraliq.nomi} (${row.darsJadvali.vaqtOraliq.boshlanishVaqti})`
        : "-",
      oqituvchi: row.teacher ? `${row.teacher.firstName} ${row.teacher.lastName}` : "-",
    })),
  });
}

async function getMyClassBaholar(req, res) {
  const student = await prisma.student.findUnique({
    where: { userId: req.user.sub },
    select: {
      id: true,
      enrollments: {
        where: { isActive: true },
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { classroom: { select: { id: true, name: true, academicYear: true } } },
      },
    },
  });
  if (!student) {
    throw new ApiError(404, "STUDENT_TOPILMADI", "Student topilmadi");
  }

  const classroom = student.enrollments?.[0]?.classroom;
  if (!classroom) {
    throw new ApiError(404, "SINF_TOPILMADI", "Sizga biriktirilgan aktiv sinf topilmadi");
  }

  const page = parseIntSafe(req.query.page, 1);
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;

  const dayRange = parseDayRange(req.query.sana);
  const sanaFrom = dayRange?.from || parseDateStart(req.query.sanaFrom);
  const sanaTo = dayRange?.to || parseDateEnd(req.query.sanaTo);

  const where = {
    ...(req.query.bahoTuri ? { turi: req.query.bahoTuri } : {}),
    ...(sanaFrom || sanaTo ? { sana: { ...(sanaFrom ? { gte: sanaFrom } : {}), ...(sanaTo ? { lte: sanaTo } : {}) } } : {}),
    darsJadvali: {
      sinfId: classroom.id,
      ...(req.query.subjectId ? { fanId: req.query.subjectId } : {}),
    },
  };

  const [items, total, allForStats] = await prisma.$transaction([
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
            vaqtOraliq: { select: { nomi: true, boshlanishVaqti: true } },
          },
        },
      },
      orderBy: [{ sana: "desc" }, { createdAt: "desc" }],
    }),
    prisma.baho.count({ where }),
    prisma.baho.findMany({ where, select: { turi: true, ball: true, maxBall: true } }),
  ]);

  res.json({
    ok: true,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
    classroom: `${classroom.name} (${classroom.academicYear})`,
    stats: buildStats(allForStats),
    baholar: items.map((row) => ({
      id: row.id,
      sana: toIsoDate(row.sana),
      turi: row.turi,
      ball: row.ball,
      maxBall: row.maxBall,
      izoh: row.izoh || "",
      student: row.student ? `${row.student.firstName} ${row.student.lastName}` : "-",
      fan: row.darsJadvali?.fan?.name || "-",
      vaqt: row.darsJadvali?.vaqtOraliq
        ? `${row.darsJadvali.vaqtOraliq.nomi} (${row.darsJadvali.vaqtOraliq.boshlanishVaqti})`
        : "-",
      oqituvchi: row.teacher ? `${row.teacher.firstName} ${row.teacher.lastName}` : "-",
    })),
  });
}

module.exports = { getMyBaholar, getMyClassBaholar };
