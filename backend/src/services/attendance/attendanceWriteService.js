const prisma = require("../../prisma");
const { ApiError } = require("../../utils/apiError");
const { parseSanaOrToday, localTodayIsoDate } = require("../../utils/attendancePeriod");
const { combineLocalDateAndTimeToUtc } = require("../../utils/tashkentTime");
const { getTeacherAttendanceScopeByUserId } = require("./attendanceService");
const { ensureDateMatchesLessonDay } = require("./attendanceTeacherShared");

function parseTimeToHoursMinutes(value) {
  const [hoursRaw, minutesRaw] = String(value || "").split(":");
  const hours = Number.parseInt(hoursRaw, 10);
  const minutes = Number.parseInt(minutesRaw, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

function createDarsDateTimeUTC(sana, boshlanishVaqti) {
  const parsed = parseTimeToHoursMinutes(boshlanishVaqti);
  if (!parsed) return null;
  const sanaIso = sana.toISOString().slice(0, 10);
  return combineLocalDateAndTimeToUtc(
    sanaIso,
    `${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}`,
  );
}

async function saveTeacherDarsDavomatiByUserId({ userId, darsId, body }) {
  const { sana: sanaStr, davomatlar } = body;
  const { sana } = parseSanaOrToday(sanaStr);
  const todayStr = localTodayIsoDate();
  if (sanaStr > todayStr) {
    throw new ApiError(
      400,
      "KELAJAK_SANA_MUMKIN_EMAS",
      "Kelajak sana uchun davomat yoki baho saqlab bo'lmaydi",
    );
  }

  const teacher = await getTeacherAttendanceScopeByUserId(userId);

  const dars = await prisma.darsJadvali.findFirst({
    where: { id: darsId, oqituvchiId: teacher.id },
    select: {
      id: true,
      sinfId: true,
      haftaKuni: true,
      vaqtOraliq: { select: { boshlanishVaqti: true } },
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

  const darsBoshlanishSana = createDarsDateTimeUTC(
    sana,
    dars.vaqtOraliq?.boshlanishVaqti,
  );
  if (darsBoshlanishSana) {
    const tahrirMuddatOxiri = new Date(
      darsBoshlanishSana.getTime() + 24 * 60 * 60 * 1000,
    );
    if (new Date() > tahrirMuddatOxiri) {
      throw new ApiError(
        403,
        "DAVOMAT_YOPILGAN",
        "Bu dars davomatini tahrirlash muddati tugagan (24 soatdan oshgan)",
      );
    }
  }

  const activeEnrollments = await prisma.enrollment.findMany({
    where: { classroomId: dars.sinfId, isActive: true },
    select: { studentId: true },
  });
  const activeStudentIds = new Set(activeEnrollments.map((item) => item.studentId));

  const invalidStudent = davomatlar.find(
    (item) => !activeStudentIds.has(item.studentId),
  );
  if (invalidStudent) {
    throw new ApiError(
      400,
      "SINF_STUDENT_NOMOS",
      "Yuborilgan studentlardan biri bu sinfga tegishli emas",
    );
  }

  const studentIds = [...new Set(davomatlar.map((item) => item.studentId))];

  await prisma.$transaction(async (tx) => {
    const [existingDavomatlar, existingBaholar] = await Promise.all([
      tx.davomat.findMany({
        where: {
          darsJadvaliId: darsId,
          sana,
          studentId: { in: studentIds },
        },
        select: { id: true, studentId: true },
      }),
      tx.baho.findMany({
        where: {
          darsJadvaliId: darsId,
          sana,
          studentId: { in: studentIds },
        },
        select: { id: true, studentId: true, turi: true },
      }),
    ]);

    const existingDavomatByStudentId = new Map(
      existingDavomatlar.map((row) => [row.studentId, row]),
    );
    const existingBahoByKey = new Map(
      existingBaholar.map((row) => [`${row.studentId}__${row.turi}`, row]),
    );

    const davomatCreates = [];
    const davomatUpdateOps = [];
    const bahoCreates = [];
    const bahoUpdateOps = [];
    const bahoDeleteIds = [];

    for (const item of davomatlar) {
      const existingDavomat = existingDavomatByStudentId.get(item.studentId);
      if (existingDavomat) {
        davomatUpdateOps.push(
          tx.davomat.update({
            where: { id: existingDavomat.id },
            data: {
              holat: item.holat,
              izoh: item.izoh || null,
              belgilaganTeacherId: teacher.id,
            },
          }),
        );
      } else {
        davomatCreates.push({
          darsJadvaliId: darsId,
          studentId: item.studentId,
          belgilaganTeacherId: teacher.id,
          sana,
          holat: item.holat,
          izoh: item.izoh || null,
        });
      }

      if (item.bahoBall === null && item.bahoTuri !== undefined) {
        const key = `${item.studentId}__${item.bahoTuri}`;
        const existingBaho = existingBahoByKey.get(key);
        if (existingBaho) bahoDeleteIds.push(existingBaho.id);
        continue;
      }

      if (
        typeof item.bahoBall === "number" &&
        typeof item.bahoMaxBall === "number" &&
        item.bahoTuri !== undefined
      ) {
        const key = `${item.studentId}__${item.bahoTuri}`;
        const existingBaho = existingBahoByKey.get(key);

        if (existingBaho) {
          bahoUpdateOps.push(
            tx.baho.update({
              where: { id: existingBaho.id },
              data: {
                teacherId: teacher.id,
                ball: item.bahoBall,
                maxBall: item.bahoMaxBall,
                izoh: item.bahoIzoh || null,
              },
            }),
          );
        } else {
          bahoCreates.push({
            darsJadvaliId: darsId,
            studentId: item.studentId,
            teacherId: teacher.id,
            sana,
            turi: item.bahoTuri,
            ball: item.bahoBall,
            maxBall: item.bahoMaxBall,
            izoh: item.bahoIzoh || null,
          });
        }
      }
    }

    if (davomatCreates.length) await tx.davomat.createMany({ data: davomatCreates });
    if (bahoCreates.length) await tx.baho.createMany({ data: bahoCreates });
    if (bahoDeleteIds.length) {
      await tx.baho.deleteMany({ where: { id: { in: bahoDeleteIds } } });
    }
    if (davomatUpdateOps.length) await Promise.all(davomatUpdateOps);
    if (bahoUpdateOps.length) await Promise.all(bahoUpdateOps);
  });

  return {
    sana: sana.toISOString().slice(0, 10),
    count: davomatlar.length,
  };
}

module.exports = {
  saveTeacherDarsDavomatiByUserId,
};
