const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { parseSanaOrToday } = require("../../utils/attendancePeriod");
const { localDayRangeUtc } = require("../../utils/tashkentTime");
const { getTeacherAttendanceScopeByUserId } = require("./attendanceService");
const {
  haftaKuniFromDate,
  ensureDateMatchesLessonDay,
  findStudentPrimaryBaho,
} = require("./attendanceTeacherShared");

async function getTeacherDarslarByUserId({ userId, query = {} }) {
  const { sana } = parseSanaOrToday(query.sana);
  const dayRange = localDayRangeUtc(sana.toISOString().slice(0, 10));
  const haftaKuni = haftaKuniFromDate(sana);
  const requestedOquvYili = query.oquvYili?.trim();

  const teacher = await getTeacherAttendanceScopeByUserId(userId);

  const oquvYiliRows = await prisma.darsJadvali.findMany({
    where: { oqituvchiId: teacher.id },
    select: { oquvYili: true },
    distinct: ["oquvYili"],
    orderBy: { oquvYili: "desc" },
  });
  const oquvYillar = [
    ...new Set(
      oquvYiliRows.map((row) => row.oquvYili?.trim()).filter(Boolean),
    ),
  ];
  const oquvYili = requestedOquvYili || oquvYillar[0] || "";

  if (!haftaKuni) {
    return {
      ok: true,
      sana: sana.toISOString().slice(0, 10),
      haftaKuni: null,
      oquvYili,
      oquvYillar,
      teacher,
      darslar: [],
    };
  }

  const darslar = await prisma.darsJadvali.findMany({
    where: {
      oqituvchiId: teacher.id,
      haftaKuni,
      ...(oquvYili ? { oquvYili } : {}),
    },
    include: {
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
      fan: { select: { id: true, name: true } },
      vaqtOraliq: {
        select: {
          id: true,
          nomi: true,
          boshlanishVaqti: true,
          tugashVaqti: true,
          tartib: true,
        },
      },
      davomatlar: {
        where: {
          sana: {
            gte: dayRange.from,
            lt: dayRange.to,
          },
        },
        select: { id: true, holat: true },
      },
    },
    orderBy: { vaqtOraliq: { tartib: "asc" } },
  });

  return {
    ok: true,
    sana: sana.toISOString().slice(0, 10),
    haftaKuni,
    oquvYili,
    oquvYillar,
    teacher,
    darslar: darslar.map((item) => ({
      id: item.id,
      sinf: {
        id: item.sinf.id,
        name: item.sinf.name,
        academicYear: item.sinf.academicYear,
      },
      fan: item.fan,
      vaqtOraliq: item.vaqtOraliq,
      jamiStudent: item.sinf.enrollments.length,
      belgilangan: item.davomatlar.length,
    })),
  };
}

async function getTeacherDarsDavomatiByUserId({ userId, darsId, query = {} }) {
  const { sana } = parseSanaOrToday(query.sana);
  const dayRange = localDayRangeUtc(sana.toISOString().slice(0, 10));
  const teacher = await getTeacherAttendanceScopeByUserId(userId);

  const dars = await prisma.darsJadvali.findFirst({
    where: { id: darsId, oqituvchiId: teacher.id },
    include: {
      sinf: {
        select: {
          id: true,
          name: true,
          academicYear: true,
          enrollments: {
            where: { isActive: true },
            include: {
              student: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  user: { select: { username: true } },
                },
              },
            },
          },
        },
      },
      fan: { select: { id: true, name: true } },
      vaqtOraliq: {
        select: {
          id: true,
          nomi: true,
          boshlanishVaqti: true,
          tugashVaqti: true,
        },
      },
      davomatlar: {
        where: { sana: { gte: dayRange.from, lt: dayRange.to } },
        select: { id: true, studentId: true, holat: true, izoh: true },
      },
      baholar: {
        where: { sana: { gte: dayRange.from, lt: dayRange.to } },
        select: {
          id: true,
          studentId: true,
          turi: true,
          ball: true,
          maxBall: true,
          izoh: true,
        },
      },
    },
  });

  if (!dars) {
    throw new ApiError(
      404,
      "DARS_TOPILMADI",
      "Bu dars sizga tegishli emas yoki topilmadi",
    );
  }

  ensureDateMatchesLessonDay(sana, dars.haftaKuni);

  const davomatMap = new Map(dars.davomatlar.map((item) => [item.studentId, item]));
  const students = dars.sinf.enrollments.map((enrollment) => {
    const mark = davomatMap.get(enrollment.studentId);
    const baho = findStudentPrimaryBaho(dars.baholar, enrollment.studentId);
    return {
      id: enrollment.student.id,
      fullName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
      username: enrollment.student.user?.username || "",
      holat: mark?.holat || "KELDI",
      izoh: mark?.izoh || "",
      belgilangan: Boolean(mark),
      bahoBall: baho?.ball ?? null,
      bahoMaxBall: baho?.maxBall ?? 5,
      bahoTuri: baho?.turi ?? "JORIY",
      bahoIzoh: baho?.izoh || "",
      baholangan: Boolean(baho),
    };
  });

  return {
    ok: true,
    sana: sana.toISOString().slice(0, 10),
    dars: {
      id: dars.id,
      haftaKuni: dars.haftaKuni,
      fan: dars.fan,
      sinf: {
        id: dars.sinf.id,
        name: dars.sinf.name,
        academicYear: dars.sinf.academicYear,
      },
      vaqtOraliq: dars.vaqtOraliq,
    },
    students,
  };
}

module.exports = {
  getTeacherDarslarByUserId,
  getTeacherDarsDavomatiByUserId,
};
