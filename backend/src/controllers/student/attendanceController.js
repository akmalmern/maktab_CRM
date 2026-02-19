const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const {
  parseSanaOrToday,
  buildRangeByType,
} = require("../../utils/attendancePeriod");

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function calcFoiz(records) {
  if (!records.length) return 0;
  const present = records.filter(
    (r) => r.holat === "KELDI" || r.holat === "KECHIKDI",
  ).length;
  return Number(((present / records.length) * 100).toFixed(1));
}

function countByHolat(records) {
  return records.reduce(
    (acc, row) => {
      acc[row.holat] += 1;
      return acc;
    },
    { KELDI: 0, KECHIKDI: 0, SABABLI: 0, SABABSIZ: 0 },
  );
}

function pickPrimaryBaho(baholar) {
  if (!baholar?.length) return null;
  return baholar.find((item) => item.turi === "JORIY") || baholar[0];
}

async function getMyAttendance(req, res) {
  const { sana, sanaStr } = parseSanaOrToday(req.query.sana);
  const period = buildRangeByType(req.query.periodType, sana);

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

  const records = await prisma.davomat.findMany({
    where: {
      studentId: student.id,
      sana: { gte: period.from, lt: period.to },
    },
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
  });

  const baholar = await prisma.baho.findMany({
    where: {
      studentId: student.id,
      sana: { gte: period.from, lt: period.to },
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
      jami: records.length,
      foiz: calcFoiz(records),
      holatlar: countByHolat(records),
    },
    tarix,
  });
}

module.exports = { getMyAttendance };
