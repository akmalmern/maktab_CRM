const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { localTodayIsoDate } = require("../../utils/attendancePeriod");

const HAFTA_KUNLARI = [
  "DUSHANBA",
  "SESHANBA",
  "CHORSHANBA",
  "PAYSHANBA",
  "JUMA",
  "SHANBA",
];

function haftaKuniFromDate(sana) {
  const jsDay = sana.getUTCDay();
  if (jsDay === 0) return null;
  return HAFTA_KUNLARI[jsDay - 1];
}

function toIsoDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function calcFoizFromCounts(total, counts) {
  if (!total) return 0;
  const present = Number(counts.KELDI || 0) + Number(counts.KECHIKDI || 0);
  return Number(((present / total) * 100).toFixed(1));
}

async function getTeacherProfile(req, res) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: req.user.sub },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      user: { select: { username: true, phone: true } },
      subject: { select: { id: true, name: true } },
    },
  });

  if (!teacher) {
    throw new ApiError(404, "OQITUVCHI_TOPILMADI", "Teacher topilmadi");
  }

  const sanaStr = localTodayIsoDate();
  const sana = new Date(`${sanaStr}T00:00:00.000Z`);
  const nextDay = new Date(sana.getTime() + 24 * 60 * 60 * 1000);
  const haftaKuni = haftaKuniFromDate(sana);
  const sevenDaysAgo = new Date(sana.getTime() - 6 * 24 * 60 * 60 * 1000);

  const [
    haftalikDarslarSoni,
    todayDarslarSoni,
    uniqueClassrooms,
    davomatTotal7Kun,
    davomatGrouped7Kun,
    recentSessionGroups,
    recentBaholar,
  ] = await Promise.all([
    prisma.darsJadvali.count({
      where: { oqituvchiId: teacher.id },
    }),
    prisma.darsJadvali.count({
      where: {
        oqituvchiId: teacher.id,
        ...(haftaKuni ? { haftaKuni } : {}),
      },
    }),
    prisma.darsJadvali.findMany({
      where: { oqituvchiId: teacher.id },
      select: { sinfId: true },
      distinct: ["sinfId"],
    }),
    prisma.davomat.count({
      where: {
        belgilaganTeacherId: teacher.id,
        sana: { gte: sevenDaysAgo, lt: nextDay },
      },
    }),
    prisma.davomat.groupBy({
      where: {
        belgilaganTeacherId: teacher.id,
        sana: { gte: sevenDaysAgo, lt: nextDay },
      },
      by: ["holat"],
      _count: { _all: true },
    }),
    prisma.davomat.groupBy({
      where: { belgilaganTeacherId: teacher.id },
      by: ["darsJadvaliId", "sana"],
      _count: { _all: true },
      orderBy: [{ sana: "desc" }, { darsJadvaliId: "asc" }],
      take: 5,
    }),
    prisma.baho.findMany({
      where: { teacherId: teacher.id },
      orderBy: [{ sana: "desc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        sana: true,
        turi: true,
        ball: true,
        maxBall: true,
        student: { select: { firstName: true, lastName: true } },
        darsJadvali: {
          select: {
            fan: { select: { name: true } },
            sinf: { select: { name: true, academicYear: true } },
          },
        },
      },
    }),
  ]);

  const holatlar7Kun = { KELDI: 0, KECHIKDI: 0, SABABLI: 0, SABABSIZ: 0 };
  for (const row of davomatGrouped7Kun || []) {
    if (row?.holat && holatlar7Kun[row.holat] !== undefined) {
      holatlar7Kun[row.holat] = row._count?._all || 0;
    }
  }

  const darsIds = [...new Set(recentSessionGroups.map((row) => row.darsJadvaliId))];
  const darsRows = darsIds.length
    ? await prisma.darsJadvali.findMany({
        where: { id: { in: darsIds } },
        select: {
          id: true,
          fan: { select: { name: true } },
          sinf: { select: { name: true, academicYear: true } },
          vaqtOraliq: { select: { nomi: true, boshlanishVaqti: true } },
        },
      })
    : [];
  const darsMap = new Map(darsRows.map((row) => [row.id, row]));

  res.json({
    ok: true,
    profile: {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      fullName: `${teacher.firstName} ${teacher.lastName}`.trim(),
      username: teacher.user?.username || "-",
      phone: teacher.user?.phone || "",
      subject: teacher.subject || null,
      dashboard: {
        sana: sanaStr,
        bugungiDarslarSoni: todayDarslarSoni,
        haftalikDarslarSoni,
        biriktirilganSinflarSoni: uniqueClassrooms.length,
        davomat7Kun: {
          jami: davomatTotal7Kun,
          foiz: calcFoizFromCounts(davomatTotal7Kun, holatlar7Kun),
          holatlar: holatlar7Kun,
        },
        oxirgiSessiyalar: recentSessionGroups.map((row) => {
          const dars = darsMap.get(row.darsJadvaliId);
          return {
            id: `${row.darsJadvaliId}-${toIsoDate(row.sana)}`,
            sana: toIsoDate(row.sana),
            fan: dars?.fan?.name || "-",
            sinf: dars?.sinf
              ? `${dars.sinf.name} (${dars.sinf.academicYear})`
              : "-",
            vaqt: dars?.vaqtOraliq
              ? `${dars.vaqtOraliq.nomi} (${dars.vaqtOraliq.boshlanishVaqti})`
              : "-",
            studentlarSoni: row._count?._all || 0,
          };
        }),
        oxirgiBaholar: recentBaholar.map((row) => ({
          id: row.id,
          sana: toIsoDate(row.sana),
          turi: row.turi,
          ball: row.ball,
          maxBall: row.maxBall,
          fan: row.darsJadvali?.fan?.name || "-",
          sinf: row.darsJadvali?.sinf
            ? `${row.darsJadvali.sinf.name} (${row.darsJadvali.sinf.academicYear})`
            : "-",
          student: row.student
            ? `${row.student.firstName} ${row.student.lastName}`
            : "-",
        })),
      },
    },
  });
}

module.exports = {
  getTeacherProfile,
};
