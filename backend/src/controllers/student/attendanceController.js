const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const {
  parseSanaOrToday,
  buildRangeByType,
} = require("../../utils/attendancePeriod");

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseIntSafe(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeHolatCounts(groupRows) {
  const counts = { KELDI: 0, KECHIKDI: 0, SABABLI: 0, SABABSIZ: 0 };
  for (const row of groupRows || []) {
    if (row?.holat && counts[row.holat] !== undefined) {
      counts[row.holat] = row._count?._all || 0;
    }
  }
  return counts;
}

function calcFoizFromCounts(total, counts) {
  if (!total) return 0;
  const present = Number(counts.KELDI || 0) + Number(counts.KECHIKDI || 0);
  return Number(((present / total) * 100).toFixed(1));
}

function pickPrimaryBaho(baholar) {
  if (!baholar?.length) return null;
  return baholar.find((item) => item.turi === "JORIY") || baholar[0];
}

async function getMyAttendance(req, res) {
  const { sana, sanaStr } = parseSanaOrToday(req.query.sana);
  const period = buildRangeByType(req.query.periodType, sana);
  const page = parseIntSafe(req.query.page, 1);
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const skip = (page - 1) * limit;

  const student = await prisma.student.findUnique({
    where: { userId: req.user.sub },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      enrollments: {
        where: { isActive: true },
        take: 1,
        orderBy: { createdAt: "desc" },
        include: {
          classroom: { select: { id: true, name: true, academicYear: true } },
        },
      },
    },
  });

  if (!student) {
    throw new ApiError(404, "STUDENT_TOPILMADI", "Student profili topilmadi");
  }

  const where = {
    studentId: student.id,
    ...(req.query.holat ? { holat: req.query.holat } : {}),
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

  const tarix = records.map((row) => ({
    ...(() => {
      const relatedBaholar =
        bahoMap.get(`${row.darsJadvaliId}__${toIsoDate(row.sana)}`) || [];
      const baho = pickPrimaryBaho(relatedBaholar);
      return {
        bahoBall: baho?.ball ?? null,
        bahoMaxBall: baho?.maxBall ?? null,
        bahoTuri: baho?.turi ?? null,
        bahoIzoh: baho?.izoh || "",
      };
    })(),
    id: row.id,
    sana: toIsoDate(row.sana),
    holat: row.holat,
    izoh: row.izoh || "",
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
  }));

  res.json({
    ok: true,
    sana: sanaStr,
    periodType: period.type,
    holat: req.query.holat || null,
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
  });
}

module.exports = { getMyAttendance };
