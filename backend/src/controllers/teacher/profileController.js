const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { localTodayIsoDate } = require("../../utils/attendancePeriod");
const {
  addDaysToIsoDate,
  combineLocalDateAndTimeToUtc,
  localDayRangeUtc,
  weekdayFromIsoDate,
} = require("../../utils/tashkentTime");

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

function buildLessonTimeLabel(vaqtOraliq) {
  if (!vaqtOraliq?.boshlanishVaqti) return "-";
  return vaqtOraliq?.nomi
    ? `${vaqtOraliq.nomi} (${vaqtOraliq.boshlanishVaqti})`
    : vaqtOraliq.boshlanishVaqti;
}

function buildLessonPublicPayload({
  row,
  sana,
  holat = "UPCOMING",
  belgilanganDavomatSoni = 0,
  baholarSoni = 0,
}) {
  const studentlarSoni = row?.sinf?.enrollments?.length || 0;
  const pendingDavomatSoni = Math.max(studentlarSoni - Number(belgilanganDavomatSoni || 0), 0);

  return {
    id: `${row.id}-${sana}`,
    darsId: row.id,
    sana,
    fan: row?.fan?.name || "-",
    sinf: row?.sinf ? `${row.sinf.name} (${row.sinf.academicYear})` : "-",
    vaqt: buildLessonTimeLabel(row?.vaqtOraliq),
    boshlanishVaqti: row?.vaqtOraliq?.boshlanishVaqti || "",
    tugashVaqti: row?.vaqtOraliq?.tugashVaqti || "",
    studentlarSoni,
    belgilanganDavomatSoni,
    pendingDavomatSoni,
    baholarSoni,
    holat,
  };
}

function buildNextLesson({ rows, todayIso, now }) {
  const currentWeekday = weekdayFromIsoDate(todayIso);
  const candidates = [];

  for (const row of rows || []) {
    const targetWeekday = HAFTA_KUNLARI.indexOf(row.haftaKuni) + 1;
    if (targetWeekday <= 0) continue;

    let diffDays = targetWeekday - currentWeekday;
    if (diffDays < 0) diffDays += 7;

    let sana = addDaysToIsoDate(todayIso, diffDays);
    let startAt = combineLocalDateAndTimeToUtc(sana, row?.vaqtOraliq?.boshlanishVaqti);
    let endAt = combineLocalDateAndTimeToUtc(sana, row?.vaqtOraliq?.tugashVaqti);

    if (!startAt || !endAt) continue;

    if (endAt.getTime() <= now.getTime()) {
      sana = addDaysToIsoDate(sana, 7);
      startAt = combineLocalDateAndTimeToUtc(sana, row?.vaqtOraliq?.boshlanishVaqti);
      endAt = combineLocalDateAndTimeToUtc(sana, row?.vaqtOraliq?.tugashVaqti);
      if (!startAt || !endAt) continue;
    }

    candidates.push({
      row,
      sana,
      startAt,
      endAt,
      holat: startAt.getTime() <= now.getTime() ? "ONGOING" : "UPCOMING",
    });
  }

  candidates.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const next = candidates[0];
  if (!next) return null;

  const isToday = next.sana === todayIso;
  return buildLessonPublicPayload({
    row: next.row,
    sana: next.sana,
    holat: next.holat,
    belgilanganDavomatSoni: isToday ? next.row?.davomatlar?.length || 0 : 0,
    baholarSoni: isToday ? next.row?.baholar?.length || 0 : 0,
  });
}

function buildTodayTasks({ rows, todayIso, now }) {
  const lessons = (rows || []).map((row) => {
    const startAt = combineLocalDateAndTimeToUtc(todayIso, row?.vaqtOraliq?.boshlanishVaqti);
    const endAt = combineLocalDateAndTimeToUtc(todayIso, row?.vaqtOraliq?.tugashVaqti);
    const belgilanganDavomatSoni = row?.davomatlar?.length || 0;
    const baholarSoni = row?.baholar?.length || 0;
    const hasStarted = startAt ? startAt.getTime() <= now.getTime() : false;
    const isOngoing = startAt && endAt
      ? startAt.getTime() <= now.getTime() && endAt.getTime() > now.getTime()
      : false;

    return buildLessonPublicPayload({
      row,
      sana: todayIso,
      holat: isOngoing ? "ONGOING" : hasStarted ? "DONE" : "UPCOMING",
      belgilanganDavomatSoni,
      baholarSoni,
    });
  });

  const boshlanganlar = lessons.filter((item) => item.holat === "ONGOING" || item.holat === "DONE");
  const kelayotganlar = lessons.filter((item) => item.holat === "UPCOMING");
  const davomatKutilayotganlar = boshlanganlar.filter((item) => item.pendingDavomatSoni > 0);
  const davomatYakunlanganlar = boshlanganlar.filter((item) => item.pendingDavomatSoni === 0);
  const primaryLesson = davomatKutilayotganlar[0] || kelayotganlar[0] || null;

  return {
    jamiDarslar: lessons.length,
    boshlanganDarslar: boshlanganlar.length,
    kelayotganDarslar: kelayotganlar.length,
    davomatKutilayotganlar: davomatKutilayotganlar.length,
    davomatYakunlanganlar: davomatYakunlanganlar.length,
    bugungiBaholarSoni: lessons.reduce((sum, item) => sum + Number(item.baholarSoni || 0), 0),
    primaryLesson,
  };
}

async function getTeacherProfile(req, res) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: req.user.sub },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarPath: true,
      user: { select: { username: true, phone: true } },
      subject: { select: { id: true, name: true } },
    },
  });

  if (!teacher) {
    throw new ApiError(404, "OQITUVCHI_TOPILMADI", "Teacher topilmadi");
  }

  const sanaStr = localTodayIsoDate();
  const sana = new Date(`${sanaStr}T00:00:00.000Z`);
  const haftaKuni = haftaKuniFromDate(sana);
  const now = new Date();
  const todayRange = localDayRangeUtc(sanaStr);
  const sevenDayStart = localDayRangeUtc(addDaysToIsoDate(sanaStr, -6)).from;

  const academicYearRows = await prisma.darsJadvali.findMany({
    where: { oqituvchiId: teacher.id },
    select: { oquvYili: true },
    distinct: ["oquvYili"],
    orderBy: { oquvYili: "desc" },
    take: 1,
  });
  const currentOquvYili = academicYearRows[0]?.oquvYili || "";

  const [
    weeklyScheduleRows,
    davomatTotal7Kun,
    davomatGrouped7Kun,
    recentSessionGroups,
    recentBaholar,
  ] = await Promise.all([
    prisma.darsJadvali.findMany({
      where: {
        oqituvchiId: teacher.id,
        ...(currentOquvYili ? { oquvYili: currentOquvYili } : {}),
      },
      select: {
        id: true,
        sinfId: true,
        haftaKuni: true,
        sinf: {
          select: {
            id: true,
            name: true,
            academicYear: true,
            enrollments: {
              where: { isActive: true },
              select: { id: true },
            },
          },
        },
        fan: { select: { name: true } },
        vaqtOraliq: {
          select: {
            nomi: true,
            boshlanishVaqti: true,
            tugashVaqti: true,
            tartib: true,
          },
        },
        davomatlar: {
          where: {
            sana: {
              gte: todayRange.from,
              lt: todayRange.to,
            },
          },
          select: { id: true },
        },
        baholar: {
          where: {
            sana: {
              gte: todayRange.from,
              lt: todayRange.to,
            },
          },
          select: { id: true },
        },
      },
      orderBy: [{ haftaKuni: "asc" }, { vaqtOraliq: { tartib: "asc" } }],
    }),
    prisma.davomat.count({
      where: {
        belgilaganTeacherId: teacher.id,
        sana: { gte: sevenDayStart, lt: todayRange.to },
      },
    }),
    prisma.davomat.groupBy({
      where: {
        belgilaganTeacherId: teacher.id,
        sana: { gte: sevenDayStart, lt: todayRange.to },
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
            sinf: { select: { id: true, name: true, academicYear: true } },
          },
        },
      },
    }),
  ]);

  const haftalikDarslarSoni = weeklyScheduleRows.length;
  const todayLessonRows = haftaKuni
    ? weeklyScheduleRows.filter((row) => row.haftaKuni === haftaKuni)
    : [];
  const todayDarslarSoni = todayLessonRows.length;
  const uniqueClassrooms = new Set(weeklyScheduleRows.map((row) => row.sinfId)).size;
  const keyingiDars = buildNextLesson({
    rows: weeklyScheduleRows,
    todayIso: sanaStr,
    now,
  });
  const bugungiVazifalar = buildTodayTasks({
    rows: todayLessonRows,
    todayIso: sanaStr,
    now,
  });

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
      avatarPath: teacher.avatarPath || null,
      subject: teacher.subject || null,
      dashboard: {
        sana: sanaStr,
        bugungiDarslarSoni: todayDarslarSoni,
        haftalikDarslarSoni,
        biriktirilganSinflarSoni: uniqueClassrooms,
        oquvYili: currentOquvYili,
        davomat7Kun: {
          jami: davomatTotal7Kun,
          foiz: calcFoizFromCounts(davomatTotal7Kun, holatlar7Kun),
          holatlar: holatlar7Kun,
        },
        keyingiDars,
        bugungiVazifalar,
        oxirgiSessiyalar: recentSessionGroups.map((row) => {
          const dars = darsMap.get(row.darsJadvaliId);
          return {
            id: `${row.darsJadvaliId}-${toIsoDate(row.sana)}`,
            darsId: row.darsJadvaliId,
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
          classroomId: row.darsJadvali?.sinf?.id || null,
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
